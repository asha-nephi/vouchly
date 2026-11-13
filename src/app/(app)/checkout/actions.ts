"use server";

import { redirect } from "next/navigation";
import { and, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, products, shops } from "@/db/schema";
import { currentUser, makeToken } from "@/lib/auth";
import { buyerFor, guestValues } from "@/lib/guest";
import { readBasket } from "@/lib/basket";
import { AREAS } from "@/lib/catalog";
import { holdMode, nextDeliveryDay } from "@/lib/orders";
import { paystackReady } from "@/lib/paystack";
import { newOrderCode, startPayment } from "@/lib/start-payment";

export type CheckoutState = { error?: string; values?: Record<string, string> } | undefined;

export async function placeOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const me = await currentUser();
  const basket = await readBasket();
  if (!basket) redirect("/basket");

  const method = String(form.get("method") ?? "") as "pickup" | "drop_off" | "rider";
  const area = String(form.get("area") ?? "");
  const address = String(form.get("address") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  const values = { method, area, address, note, ...guestValues(form) };
  const fail = (error: string): CheckoutState => ({ error, values });

  const [[shop], [d]] = await Promise.all([
    db.select().from(shops).where(eq(shops.id, basket.shopId)).limit(1),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, basket.shopId)).limit(1),
  ]);
  if (!shop || !d) return fail("This shop isn't ready to take orders yet.");
  if (!shop.isOpen) return fail("This shop has closed for now.");
  if (me && shop.ownerId === me.id) return fail("You can't order from your own shop.");
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
    .where(and(inArray(products.id, ids), eq(products.shopId, shop.id), eq(products.kind, "item"), eq(products.isActive, true), eq(products.removed, false)));
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

  if (!paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");

  // Signed-in buyer, or a guest made from the name and phone they typed.
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;

  // Save the order first, then send the buyer to Paystack.
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
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
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo, totalKobo });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}
