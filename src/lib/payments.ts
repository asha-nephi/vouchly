import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, shops } from "@/db/schema";
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
    .where(and(eq(orders.id, order.id), eq(orders.status, "awaiting_payment")))
    .returning({ id: orders.id });
  if (now.length) {
    const [shop] = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, order.shopId));
    if (shop) await notify(shop.ownerId, "New order", `Order ${order.code} · ${naira(order.itemsKobo)} for ${deliveryDayLabel(order.deliveryDay)}.`, `/shop/manage/orders/${order.code}`);
  }
  return { code: order.code };
}

