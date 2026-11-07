"use server";

import { redirect } from "next/navigation";
import { and, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, payments, products, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { readBasket } from "@/lib/basket";
import { AREAS, naira } from "@/lib/catalog";
import { holdMode, makeOrderCode, nextDeliveryDay, ourShareKobo, payEmail } from "@/lib/orders";
import { initializePayment, paystackReady } from "@/lib/paystack";

export type CheckoutState = { error?: string; values?: Record<string, string> } | undefined;

const siteUrl = () => process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

export async function placeOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await requireUser();
  const basket = await readBasket();
  if (!basket) redirect("/basket");

  const method = String(form.get("method") ?? "") as "pickup" | "drop_off" | "rider";
  const area = String(form.get("area") ?? "");
  const address = String(form.get("address") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  const values = { method, area, address, note };
  const fail = (error: string): CheckoutState => ({ error, values });

  const [[shop], [d]] = await Promise.all([
    db.select().from(shops).where(eq(shops.id, basket.shopId)).limit(1),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, basket.shopId)).limit(1),
  ]);
  if (!shop || !d) return fail("This shop isn't ready to take orders yet.");
  if (!shop.isOpen) return fail("This shop has closed for now.");
  if (shop.ownerId === user.id) return fail("You can't order from your own shop.");
  // Pilot: Paystack pays sellers straight into their account, so they need one set up.
  if (!holdMode() && !shop.paystackSubaccount) return fail(`${shop.name} hasn't set up payments yet, so they can't take orders.`);

  // Which way, and is it allowed?
  if (method === "pickup" && !d.pickupOn) return fail("Pickup isn't available for this shop.");
  if (method === "drop_off" && !d.dropOffOn) return fail("Drop-off isn't available for this shop.");
  if (method === "rider" && !d.riderOn) return fail("Rider delivery isn't available for this shop.");
  if (!["pickup", "drop_off", "rider"].includes(method)) return fail("Please choose how you want to get your order.");
  if (method !== "pickup") {
    if (!AREAS.includes(area as (typeof AREAS)[number])) return fail("Please pick your area.");
    if (address.length < 6) return fail("Please add your delivery address.");
    if (method === "drop_off" && !d.dropOffAreas.includes(area)) return fail(`${shop.name} doesn't drop off in ${area}. Try pickup or a rider.`);
  }

  // Current prices, never the ones the browser sent.
  const ids = Object.keys(basket.items);
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.shopId, shop.id), eq(products.isActive, true), eq(products.removed, false)));
  if (!rows.length) return fail("The items in your basket aren't available any more.");
  const lines = rows.map((p) => ({ p, qty: basket.items[p.id] }));
  const itemsKobo = lines.reduce((s, l) => s + l.p.priceKobo * l.qty, 0);

  const inStockOnly = lines.every((l) => l.p.sellMode === "in_stock");
  const day = nextDeliveryDay(d.deliveryDays, d.orderCutoff, new Date(), inStockOnly);
  if (!day) return fail("This shop has no delivery days set yet.");

  // Daily limits: count what's already ordered for that day.
  const limited = lines.filter((l) => l.p.maxPerDay);
  if (limited.length) {
    const taken = await db
      .select({ productId: orderItems.productId, n: sql<number>`sum(${orderItems.quantity})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          inArray(orderItems.productId, limited.map((l) => l.p.id)),
          eq(orders.deliveryDay, day),
          ne(orders.status, "cancelled"),
          or(ne(orders.status, "awaiting_payment"), gte(orders.createdAt, new Date(Date.now() - 60 * 60_000))),
        ),
      )
      .groupBy(orderItems.productId);
    for (const l of limited) {
      const left = l.p.maxPerDay! - (taken.find((t) => t.productId === l.p.id)?.n ?? 0);
      if (l.qty > left) return fail(left > 0 ? `Only ${left} more “${l.p.name}” can be made for that day.` : `“${l.p.name}” is sold out for that day.`);
    }
  }

  const deliveryFeeKobo =
    method === "drop_off" ? d.dropOffFeeKobo : method === "rider" && d.riderPayer === "fee_in_order" ? (d.riderAreaFees.default ?? 0) : 0;
  const totalKobo = itemsKobo + deliveryFeeKobo;
  const feeKobo = ourShareKobo(itemsKobo);

  if (!paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");

  // Save the order first, then send the buyer to Paystack.
  let code = makeOrderCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select({ id: orders.id }).from(orders).where(eq(orders.code, code)).limit(1);
    if (!clash) break;
    code = makeOrderCode();
  }
  const reference = `${code}-${Date.now().toString(36)}`;

  const [order] = await db
    .insert(orders)
    .values({
      code,
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: day,
      method,
      address: method === "pickup" ? null : `${address}, ${area}`,
      note: note || null,
      itemsKobo,
      deliveryFeeKobo,
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values(
    lines.map((l) => ({ orderId: order.id, productId: l.p.id, name: l.p.name, size: l.p.size, quantity: l.qty, priceKobo: l.p.priceKobo })),
  );
  await db.insert(payments).values({
    orderId: order.id,
    paystackReference: reference,
    amountKobo: totalKobo,
    feeKobo,
    sellerKobo: totalKobo - feeKobo,
  });

  let url: string;
  try {
    const res = await initializePayment({
      email: payEmail(user.phone, user.email),
      amountKobo: totalKobo,
      reference,
      callbackUrl: `${siteUrl()}/checkout/done`,
      subaccount: shop.paystackSubaccount,
      ourShareKobo: feeKobo,
      metadata: { order: code, shop: shop.name },
    });
    url = res.authorization_url;
  } catch {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
    return fail(`We couldn't start the payment of ${naira(totalKobo)}. Please try again.`);
  }
  redirect(url);
}
