"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, payments, products, reviews, shops, users } from "@/db/schema";
import { MAX_QTY, writeBasket } from "@/lib/basket";
import { requireBuyer } from "@/lib/auth";
import { refundOrder } from "@/lib/after-order";
import { notify } from "@/lib/notify";
import { orderDeadline, problemDeadline } from "@/lib/orders";
import { OPEN, PROBLEMS, REVIEW_TAGS } from "@/lib/order-status";

export type BuyerFormState = { error?: string; values?: Record<string, string>; done?: boolean } | undefined;

// Loads one of this buyer's orders, with the seller.
async function buyerOrder(code: string) {
  const user = await requireBuyer();
  const [row] = await db
    .select({ order: orders, shop: shops })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id)))
    .limit(1);
  return row ? { user, ...row } : null;
}

// Buyer confirms they got their order.
export async function markReceived(form: FormData): Promise<void> {
  const code = String(form.get("code") ?? "");
  const row = await buyerOrder(code);
  if (!row) return;
  const [order] = await db
    .update(orders)
    .set({ status: "received", receivedAt: new Date() })
    .where(and(eq(orders.id, row.order.id), inArray(orders.status, [...OPEN])))
    .returning({ id: orders.id });
  if (order) {
    // In hold mode this is the moment the seller's money is released.
    await db.update(payments).set({ releaseAt: new Date() }).where(and(eq(payments.orderId, order.id), eq(payments.status, "held")));
    await notify(row.shop.ownerId, "Order received", `${row.user.name} received order ${code}.`, `/shop/manage/orders/${code}`);
  }
  revalidatePath(`/orders/${code}`);
}

// Buyer cancels before the seller confirms and before the order deadline.
export async function cancelOrder(_: BuyerFormState, form: FormData): Promise<BuyerFormState> {
  const code = String(form.get("code") ?? "");
  const row = await buyerOrder(code);
  if (!row) return { error: "We couldn't find that order." };
  const [d] = await db.select().from(deliverySettings).where(eq(deliverySettings.shopId, row.shop.id)).limit(1);
  const booking = ["check_in", "visit", "session"].includes(row.order.method);
  const late = booking ? new Date() >= row.order.deliveryDay : d && new Date() >= orderDeadline(row.order.deliveryDay, d.orderCutoff);
  if (row.order.status !== "paid" || late) return { error: "It's too late to cancel. Please message the seller." };
  const res = await refundOrder(row.order.id, "You cancelled this order");
  if (res.error) return { error: res.error };
  revalidatePath(`/orders/${code}`);
  return { done: true };
}

// Buyer reports a problem within 48 hours of the delivery day.
export async function reportProblem(_: BuyerFormState, form: FormData): Promise<BuyerFormState> {
  const code = String(form.get("code") ?? "");
  const kind = String(form.get("kind") ?? "");
  const details = String(form.get("details") ?? "").trim().slice(0, 1000);
  const values = { kind, details };
  const row = await buyerOrder(code);
  if (!row) return { error: "We couldn't find that order." };
  const { order, shop, user } = row;
  const label = PROBLEMS.find((p) => p.value === kind)?.label;
  if (!label) return { error: "Please pick what went wrong.", values };
  if (!details) return { error: "Please tell us a little more.", values };
  if (![...OPEN, "received"].includes(order.status as never)) return { error: "You can't report a problem on this order now.", values };
  if (new Date() > problemDeadline(order.deliveryDay)) return { error: "The 48 hours to report a problem have passed. Please message the seller.", values };

  await db
    .update(orders)
    .set({ status: "disputed", problem: `${label}: ${details}`, problemAt: new Date() })
    .where(eq(orders.id, order.id));
  await notify(shop.ownerId, "Problem reported", `${user.name} reported a problem with order ${code}: ${label}.`, `/shop/manage/orders/${code}`, { email: true });
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) await notify(a.id, "Problem reported", `Order ${code} from ${shop.name}: ${label}.`, `/admin/problems?open=${code}`, { email: true });
  revalidatePath(`/orders/${code}`);
  return { done: true };
}

// One review per received order.
export async function leaveReview(_: BuyerFormState, form: FormData): Promise<BuyerFormState> {
  const code = String(form.get("code") ?? "");
  const stars = Number(form.get("stars"));
  const text = String(form.get("text") ?? "").trim().slice(0, 600);
  const tags = REVIEW_TAGS.filter((t) => form.get(`tag:${t}`) === "on");
  const row = await buyerOrder(code);
  if (!row) return { error: "We couldn't find that order." };
  if (row.order.status !== "received") return { error: "You can review once you've received your order." };
  if (!(stars >= 1 && stars <= 5)) return { error: "Please pick from 1 to 5 stars.", values: { text } };

  const added = await db
    .insert(reviews)
    .values({ orderId: row.order.id, shopId: row.shop.id, authorId: row.user.id, stars, tags, text: text || null })
    .onConflictDoNothing()
    .returning({ id: reviews.id });
  if (added.length) await notify(row.shop.ownerId, "New review", `${row.user.name} gave ${row.shop.name} ${stars} ${stars === 1 ? "star" : "stars"}.`, `/s/${row.shop.slug}`);
  revalidatePath(`/orders/${code}`);
  return { done: true };
}

// Puts the same items from an old order back in the basket, at today's prices.
export async function buyAgain(form: FormData): Promise<void> {
  const row = await buyerOrder(String(form.get("code") ?? ""));
  if (!row || !["pickup", "drop_off", "rider"].includes(row.order.method)) redirect("/orders");
  if (!row.shop.isOpen) redirect(`/orders/${row.order.code}?again=closed`);
  const lines = await db.select({ productId: orderItems.productId, qty: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, row.order.id));
  const live = lines.length
    ? await db
        .select({ id: products.id })
        .from(products)
        .where(and(inArray(products.id, lines.map((l) => l.productId)), eq(products.shopId, row.shop.id), eq(products.kind, "item"), eq(products.isActive, true), eq(products.removed, false)))
    : [];
  const ok = new Set(live.map((p) => p.id));
  const items: Record<string, number> = {};
  for (const l of lines) if (ok.has(l.productId)) items[l.productId] = Math.min(MAX_QTY, (items[l.productId] ?? 0) + l.qty);
  if (!Object.keys(items).length) redirect(`/orders/${row.order.code}?again=none`);
  await writeBasket({ shopId: row.shop.id, items });
  const missing = new Set(lines.map((l) => l.productId)).size - Object.keys(items).length;
  redirect(`/basket?again=1${missing ? `&missing=${missing}` : ""}`);
}
