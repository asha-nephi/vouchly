import "server-only";
import { and, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { addDays, dateToKey, keyToDate, todayKey, weekday } from "./dates";

type Listing = typeof products.$inferSelect;

// That day and time in Lagos as a real moment.
export const lagosAt = (dayKey: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(keyToDate(dayKey).getTime() + (h * 60 + m) * 60_000);
};

// "HH:MM" of a moment in Lagos.
export const lagosTime = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(11, 16);

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

// Bookings that hold a time or seat: anything not cancelled, and unpaid ones for 30 minutes.
const holding = () =>
  and(ne(orders.status, "cancelled"), or(ne(orders.status, "awaiting_payment"), gte(orders.createdAt, new Date(Date.now() - 30 * 60_000))));

// Start times already booked for a session, as "YYYY-MM-DD HH:MM".
export async function takenSessionTimes(productId: string, exceptOrderId?: string) {
  const rows = await db
    .select({ id: orders.id, at: orders.deliveryDay })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.productId, productId), eq(orders.method, "session"), gte(orders.deliveryDay, new Date()), holding()));
  return new Set(rows.filter((r) => r.id !== exceptOrderId).map((r) => `${dateToKey(r.at)} ${lagosTime(r.at)}`));
}

// Open start times for the next two weeks, from tomorrow.
export async function sessionSlots(p: Listing) {
  const taken = await takenSessionTimes(p.id);
  const len = p.durationMins ?? 60;
  const start = mins(p.startHour ?? "09:00");
  const end = mins(p.endHour ?? "17:00");
  const days: { day: string; times: string[] }[] = [];
  for (let k = addDays(todayKey(), 1); days.length < 14 && k <= addDays(todayKey(), 45); k = addDays(k, 1)) {
    if (!p.workDays.includes(weekday(k))) continue;
    const times: string[] = [];
    for (let t = start; t + len <= end; t += len) if (!taken.has(`${k} ${hhmm(t)}`)) times.push(hhmm(t));
    if (times.length) days.push({ day: k, times });
  }
  return days;
}

// A paid booking already has this time.
export async function sessionClash(productId: string, at: Date, exceptOrderId: string) {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, productId),
        eq(orders.method, "session"),
        eq(orders.deliveryDay, at),
        inArray(orders.status, ["paid", "confirmed", "ready", "received", "disputed"]),
        ne(orders.id, exceptOrderId),
      ),
    );
  return rows.length > 0;
}

// Tickets taken for an event. With paidOnly, only paid tickets count.
export async function ticketsTaken(productId: string, opts: { paidOnly?: boolean; exceptOrderId?: string } = {}) {
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, productId),
        eq(orders.method, "event"),
        opts.paidOnly ? inArray(orders.status, ["paid", "confirmed", "ready", "received", "disputed"]) : holding(),
        opts.exceptOrderId ? ne(orders.id, opts.exceptOrderId) : undefined,
      ),
    );
  return row?.n ?? 0;
}
