import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, shops } from "@/db/schema";
import { refundOrder } from "./after-order";
import { paidClash } from "./bookings";
import { naira } from "./catalog";
import { notify } from "./notify";
import { deliveryDayLabel, holdMode } from "./orders";
import { verifyPayment } from "./paystack";

// Marks an order paid once Paystack confirms it. Safe to call more than once.
export async function confirmPayment(reference: string): Promise<{ code: string } | null> {
  const [pay] = await db.select().from(payments).where(eq(payments.paystackReference, reference)).limit(1);
  if (!pay) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1);
  if (!order) return null;
  if (pay.status !== "pending") return { code: order.code };

  const v = await verifyPayment(reference).catch(() => null);
  if (!v || v.status !== "success" || v.amount !== pay.amountKobo) return null;

  // Hold mode: kept until "Received", or 48 hours after the end of the delivery day.
  // Pilot mode: Paystack pays the seller's subaccount on its own, so it counts as released.
  const releaseAt = new Date(order.deliveryDay.getTime() + 72 * 3600_000);
  const hold = holdMode();
  await db
    .update(payments)
    .set(hold ? { status: "held", releaseAt } : { status: "released", releaseAt, releasedAt: new Date() })
    .where(and(eq(payments.id, pay.id), eq(payments.status, "pending")));
  const now = await db
    .update(orders)
    .set({ status: "paid" })
    .where(and(eq(orders.id, order.id), inArray(orders.status, ["awaiting_payment", "quoted"])))
    .returning({ id: orders.id });
  // Two guests paid for the same nights at once: the later one gets their money back.
  if (now.length && order.method === "check_in" && order.checkOut && (await paidClash(await stayProductId(order.id), order.deliveryDay, order.checkOut, order.id))) {
    await refundOrder(order.id, "Sorry, those dates were booked by someone else just before you");
    return { code: order.code };
  }
  if (now.length) {
    const [shop] = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, order.shopId));
    const what = order.method === "check_in" ? "New booking" : order.method === "visit" ? "New job" : "New order";
    if (shop) await notify(shop.ownerId, what, `Order ${order.code} · ${naira(order.itemsKobo)} for ${deliveryDayLabel(order.deliveryDay)}.`, `/shop/manage/orders/${order.code}`);
  }
  return { code: order.code };
}


async function stayProductId(orderId: string) {
  const [it] = await db.select({ productId: orderItems.productId }).from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
  return it?.productId ?? "";
}
