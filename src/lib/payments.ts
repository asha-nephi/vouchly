import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, products, shops } from "@/db/schema";
import { refundOrder } from "./after-order";
import { paidClash } from "./bookings";
import { sessionClash, ticketsTaken } from "./sessions";
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
    // A session time or event seats taken by someone who paid just before.
    const pid = await stayProductId(order.id);
    if (order.method === "session" && (await sessionClash(pid, order.deliveryDay, order.id))) {
      await refundOrder(order.id, "Sorry, that time was booked by someone else just before you");
      return { code: order.code };
    }
    if (order.method === "event") {
      const [listing] = await db.select({ seats: products.seats }).from(products).where(eq(products.id, pid)).limit(1);
      const [mine] = await db.select({ q: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, order.id)).limit(1);
      const others = await ticketsTaken(pid, { paidOnly: true, exceptOrderId: order.id });
      if (listing?.seats && others + (mine?.q ?? 1) > listing.seats) {
        await refundOrder(order.id, "Sorry, the event sold out just before your payment went through");
        return { code: order.code };
      }
      // Paid tickets are ready at once.
      await db.update(orders).set({ status: "ready" }).where(eq(orders.id, order.id));
    }
    // Digital products are delivered the moment they're paid for.
    if (order.method === "download") await db.update(orders).set({ status: "received", receivedAt: new Date() }).where(eq(orders.id, order.id));
    const what = order.method === "check_in" || order.method === "session" ? "New booking" : order.method === "visit" ? "New job" : order.method === "download" || order.method === "event" ? "New sale" : "New order";
    if (shop) await notify(shop.ownerId, what, `Order ${order.code} · ${naira(order.itemsKobo)} for ${deliveryDayLabel(order.deliveryDay)}.`, `/shop/manage/orders/${order.code}`);
  }
  return { code: order.code };
}


async function stayProductId(orderId: string) {
  const [it] = await db.select({ productId: orderItems.productId }).from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
  return it?.productId ?? "";
}
