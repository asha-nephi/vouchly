import "server-only";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, shops } from "@/db/schema";
import { naira } from "./catalog";
import { holdMode } from "./orders";
import { notify } from "./notify";
import { refundPayment } from "./paystack";

// Gives the buyer back the full amount and cancels the order.
export async function refundOrder(orderId: string, reason: string): Promise<{ error?: string }> {
  const [row] = await db
    .select({ order: orders, pay: payments, shop: shops })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return { error: "We couldn't find that order." };
  const { order, pay, shop } = row;
  if (order.status === "cancelled" || pay.status === "refunded") return {};
  if (!["held", "released"].includes(pay.status)) return { error: "This order wasn't paid, so there's nothing to refund." };

  try {
    await refundPayment(pay.paystackReference);
  } catch (e) {
    return { error: `Paystack couldn't refund it: ${(e as Error).message}. Please try again later.` };
  }
  await db.update(payments).set({ status: "refunded", refundedKobo: pay.amountKobo }).where(eq(payments.id, pay.id));
  await db.update(orders).set({ status: "cancelled", cancelReason: reason, cancelledAt: new Date() }).where(eq(orders.id, order.id));
  await notify(order.buyerId, "Order cancelled and refunded", `${shop.name}: ${reason}. ${naira(pay.amountKobo)} is on its way back to you.`, `/orders/${order.code}`);
  await notify(shop.ownerId, "Order cancelled", `Order ${order.code} was cancelled and the buyer refunded.`, `/shop/manage/orders/${order.code}`);
  return {};
}

// Closes orders whose 48-hour window has passed, and releases held money.
export async function settleDue(now = new Date()) {
  const cutoff = new Date(now.getTime() - 72 * 3600_000); // delivery day + 72h = end of day + 48h
  const closed = await db
    .update(orders)
    .set({ status: "received", receivedAt: now, autoClosed: true })
    .where(and(inArray(orders.status, ["ready", "on_the_way"]), lte(orders.deliveryDay, cutoff)))
    .returning({ id: orders.id, code: orders.code, buyerId: orders.buyerId });
  for (const o of closed) {
    await db.update(payments).set({ releaseAt: now }).where(and(eq(payments.orderId, o.id), eq(payments.status, "held")));
    await notify(o.buyerId, "Order closed", `Order ${o.code} was marked received because no problem was reported. You can still leave a review.`, `/orders/${o.code}`);
  }

  let released = 0;
  if (holdMode()) {
    const due = await db
      .update(payments)
      .set({ status: "released", releasedAt: now })
      .where(
        and(
          eq(payments.status, "held"),
          isNotNull(payments.releaseAt),
          lte(payments.releaseAt, now),
          sql`exists (select 1 from ${orders} o where o.id = ${payments.orderId} and o.status = 'received')`,
        ),
      )
      .returning({ orderId: payments.orderId, sellerKobo: payments.sellerKobo });
    released = due.length;
    for (const p of due) {
      const [o] = await db.select({ code: orders.code, ownerId: shops.ownerId }).from(orders).innerJoin(shops, eq(shops.id, orders.shopId)).where(eq(orders.id, p.orderId));
      if (o) await notify(o.ownerId, "Payment released", `${naira(p.sellerKobo)} for order ${o.code} is on its way to you.`, `/shop/manage/orders/${o.code}`);
    }
  }
  return { closed: closed.length, released };
}

// Runs settleDue at most every 10 minutes per server, so pages can call it cheaply.
let lastRun = 0;
export async function maybeSettle() {
  if (Date.now() - lastRun < 10 * 60_000) return;
  lastRun = Date.now();
  await settleDue().catch(() => undefined);
}
