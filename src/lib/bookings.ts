import "server-only";
import { and, eq, gte, inArray, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { dateToKey, nightsOf } from "./dates";

// Nights already booked for a stay, plus nights the host blocked.
// Unpaid bookings hold their dates for 30 minutes.
export async function takenNights(product: typeof products.$inferSelect, exceptOrderId?: string) {
  const rows = await db
    .select({ id: orders.id, checkIn: orders.deliveryDay, checkOut: orders.checkOut })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, product.id),
        eq(orders.method, "check_in"),
        gte(orders.checkOut, new Date(Date.now() - 24 * 3600_000)),
        ne(orders.status, "cancelled"),
        or(ne(orders.status, "awaiting_payment"), gte(orders.createdAt, new Date(Date.now() - 30 * 60_000))),
      ),
    );
  const taken = new Set(product.blockedDates);
  for (const r of rows) {
    if (r.id === exceptOrderId || !r.checkOut) continue;
    for (const k of nightsOf(dateToKey(r.checkIn), dateToKey(r.checkOut))) taken.add(k);
  }
  return taken;
}

// Paid bookings for a stay that overlap these nights (used to catch double bookings).
export async function paidClash(productId: string, checkIn: Date, checkOut: Date, exceptOrderId: string) {
  const rows = await db
    .select({ id: orders.id, checkIn: orders.deliveryDay, checkOut: orders.checkOut })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, productId),
        eq(orders.method, "check_in"),
        inArray(orders.status, ["paid", "confirmed", "ready", "received", "disputed"]),
        ne(orders.id, exceptOrderId),
      ),
    );
  return rows.some((r) => r.checkOut && r.checkIn < checkOut && r.checkOut > checkIn);
}
