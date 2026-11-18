import { escLike } from "@/lib/like";
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, users } from "@/db/schema";
import { addDays, isDayKey, keyToDate, todayKey, weekday } from "@/lib/dates";
import { flat, tableState, type Params } from "@/components/data/params";

export const ORDER_SORTS = ["placed", "day", "buyer", "total"];

export const STATUS_FILTER = [
  { value: "need", label: "Needs me" },
  { value: "notready", label: "Paid, not ready" },
  { value: "paid", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Getting ready" },
  { value: "ready", label: "Ready" },
  { value: "on_the_way", label: "On the way" },
  { value: "disputed", label: "Problem reported" },
  { value: "requests", label: "Price requests" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];
export const HOW = [
  { value: "pickup", label: "Pickup" },
  { value: "drop_off", label: "Drop-off" },
  { value: "rider", label: "Rider" },
  { value: "check_in", label: "Stay" },
  { value: "visit", label: "Visit" },
  { value: "session", label: "Session" },
  { value: "event", label: "Event" },
  { value: "download", label: "Download" },
] as const;
export const DAY_FILTER = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "sat", label: "This Saturday" },
  { value: "week", label: "Next 7 days" },
];
export const PLACED_FILTER = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
];

// Orders that wait on the seller: same rules as sellerNext(), plus problems and price requests.
const NEEDS_ME = sql`(${orders.status} in ('disputed', 'requested')
  or (${orders.status} in ('paid', 'confirmed') and ${orders.method} not in ('event', 'download'))
  or (${orders.status} = 'preparing' and ${orders.method} in ('pickup', 'drop_off', 'rider'))
  or (${orders.status} = 'on_the_way' and ${orders.method} = 'visit'))`;

// Lagos day keys for a named range: [first day, day after the last].
function dayRange(v: string | undefined, from: string | undefined, to: string | undefined, past: boolean): [string, string] | null {
  const today = todayKey();
  if (v === "today") return [today, addDays(today, 1)];
  if (v === "tomorrow") return [addDays(today, 1), addDays(today, 2)];
  if (v === "sat") {
    const sat = addDays(today, (6 - weekday(today) + 7) % 7);
    return [sat, addDays(sat, 1)];
  }
  if (v === "week") return past ? [addDays(today, -6), addDays(today, 1)] : [today, addDays(today, 7)];
  const a = from && isDayKey(from) ? from : null;
  const b = to && isDayKey(to) ? addDays(to, 1) : null;
  if (!a && !b) return null;
  return [a ?? "2000-01-01", b ?? "2100-01-01"];
}

// The single day a filter points at, if any (for "Day list").
export function oneDay(sp: Params): string | null {
  const f = flat(sp);
  const r = dayRange(f.day, f.day_from, f.day_to, false);
  return r && addDays(r[0], 1) === r[1] ? r[0] : null;
}

export function orderFilters(shopId: string, sp: Params, codes?: string[]) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ORDER_SORTS, sort: "placed" });
  const status = f.status ?? (f.show === "requests" ? "requests" : undefined);
  const parts: (SQL | undefined)[] = [eq(orders.shopId, shopId), ne(orders.status, "awaiting_payment")];
  if (status === "need") parts.push(NEEDS_ME);
  else if (status === "notready") parts.push(inArray(orders.status, ["paid", "confirmed", "preparing"]));
  else if (status === "requests") parts.push(inArray(orders.status, ["requested", "quoted"]));
  else if (status && STATUS_FILTER.some((s) => s.value === status)) parts.push(eq(orders.status, status as "paid"));
  if (f.how && HOW.some((h) => h.value === f.how)) parts.push(eq(orders.method, f.how as "pickup"));
  const day = dayRange(f.day, f.day_from, f.day_to, false);
  if (day) parts.push(gte(orders.deliveryDay, keyToDate(day[0])), lt(orders.deliveryDay, keyToDate(day[1])));
  const placed = dayRange(f.placed, f.placed_from, f.placed_to, true);
  if (placed) parts.push(gte(orders.createdAt, keyToDate(placed[0])), lt(orders.createdAt, keyToDate(placed[1])));
  if (st.q) parts.push(or(ilike(users.name, `%${escLike(st.q)}%`), ilike(orders.code, `%${escLike(st.q)}%`)));
  if (codes) parts.push(inArray(orders.code, codes.length ? codes : ["-"]));
  const col = { placed: orders.createdAt, day: orders.deliveryDay, buyer: users.name, total: sql`${orders.itemsKobo} + ${orders.deliveryFeeKobo}` }[st.sort as "placed"];
  // Ties keep a fixed order, so rows don't jump about.
  const order = [st.dir === "asc" ? asc(col) : desc(col), desc(orders.createdAt), asc(orders.id)];
  return { st, where: and(...parts), order };
}

export type OrderRow = Awaited<ReturnType<typeof loadOrders>>["rows"][number];

// One page of orders (or every match, for CSV), with items and what the seller gets.
export async function loadOrders(shopId: string, sp: Params, opts: { all?: boolean; codes?: string[] } = {}) {
  const { st, where, order } = orderFilters(shopId, sp, opts.codes);
  const base = db
    .select({ order: orders, buyer: users.name, guest: users.isGuest, phone: users.phone })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(where)
    .orderBy(...order);
  const [list, [{ n }]] = await Promise.all([
    opts.all ? base.limit(5000) : base.limit(st.per).offset(st.offset),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).innerJoin(users, eq(users.id, orders.buyerId)).where(where),
  ]);
  const ids = list.map((r) => r.order.id);
  const [items, pays] = ids.length
    ? await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
        db.select({ orderId: payments.orderId, sellerKobo: payments.sellerKobo, status: payments.status }).from(payments).where(and(inArray(payments.orderId, ids), ne(payments.status, "pending"))),
      ])
    : [[], []];
  const rows = list.map((r) => {
    const o = r.order;
    const pay = pays.find((p) => p.orderId === o.id);
    return {
      ...r,
      items: items.filter((i) => i.orderId === o.id),
      total: o.itemsKobo + o.deliveryFeeKobo,
      youGet: pay?.sellerKobo ?? o.itemsKobo + o.deliveryFeeKobo - Math.round(o.itemsKobo * 0.05),
    };
  });
  return { st, rows, total: n };
}
