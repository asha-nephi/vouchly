import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, users } from "@/db/schema";
import { addDays, isDayKey, keyToDate, todayKey } from "@/lib/dates";
import { flat, tableState, type Params } from "@/components/data/params";

export const SALE_SORTS = ["date", "paid", "get"];
export const PAID_FILTER = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "This year" },
];
export const PAYOUT_FILTER = [
  { value: "held", label: "Held by Vouchly" },
  { value: "released", label: "Released to you" },
  { value: "refunded", label: "Refunded" },
];

// Lagos day keys for the paid-on filter: [first day, day after the last].
function paidRange(f: Record<string, string>): [string, string] | null {
  const today = todayKey();
  const end = addDays(today, 1);
  if (f.paid === "today") return [today, end];
  if (f.paid === "week") return [addDays(today, -6), end];
  if (f.paid === "month") return [addDays(today, -29), end];
  if (f.paid === "year") return [`${today.slice(0, 4)}-01-01`, end];
  const a = f.paid_from && isDayKey(f.paid_from) ? f.paid_from : null;
  const b = f.paid_to && isDayKey(f.paid_to) ? addDays(f.paid_to, 1) : null;
  if (!a && !b) return null;
  return [a ?? "2000-01-01", b ?? "2100-01-01"];
}

export type SaleRow = Awaited<ReturnType<typeof loadSales>>["rows"][number];

// One page of payments for the shop (or every match, for CSV), newest first.
export async function loadSales(shopId: string, sp: Params, opts: { all?: boolean; codes?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: SALE_SORTS, sort: "date" });
  const parts: (SQL | undefined)[] = [eq(orders.shopId, shopId), ne(payments.status, "pending")];
  if (f.payout === "held") parts.push(eq(payments.status, "held"));
  if (f.payout === "released") parts.push(eq(payments.status, "released"));
  if (f.payout === "refunded") parts.push(inArray(payments.status, ["refunded", "part_refunded"]));
  const r = paidRange(f);
  if (r) parts.push(gte(payments.createdAt, keyToDate(r[0])), lt(payments.createdAt, keyToDate(r[1])));
  if (st.q) parts.push(or(ilike(users.name, `%${st.q}%`), ilike(orders.code, `%${st.q}%`)));
  if (opts.codes) parts.push(inArray(orders.code, opts.codes.length ? opts.codes : ["-"]));
  const where = and(...parts);
  const col = {
    date: payments.createdAt,
    paid: payments.amountKobo,
    get: payments.sellerKobo,
  }[st.sort as "date"];
  const base = db
    .select({
      pay: payments,
      code: orders.code,
      buyer: users.name,
      guest: users.isGuest,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(where)
    .orderBy(st.dir === "asc" ? asc(col) : desc(col), desc(payments.createdAt), asc(payments.id));
  const [list, [sum]] = await Promise.all([
    opts.all ? base.limit(5000) : base.limit(st.per).offset(st.offset),
    db
      .select({
        n: sql<number>`count(*)::int`,
        paid: sql<number>`coalesce(sum(${payments.amountKobo} - ${payments.refundedKobo}), 0)::int`,
        refunded: sql<number>`coalesce(sum(${payments.refundedKobo}), 0)::int`,
        get: sql<number>`coalesce(sum(${payments.sellerKobo}) filter (where ${payments.status} in ('held', 'released')), 0)::int`,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(where),
  ]);
  const ids = list.map((x) => x.pay.orderId);
  const items = ids.length
    ? await db
        .select({
          orderId: orderItems.orderId,
          name: orderItems.name,
          size: orderItems.size,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, ids))
    : [];
  const rows = list.map((x) => ({
    ...x,
    items: items.filter((i) => i.orderId === x.pay.orderId),
  }));
  return { st, rows, total: sum.n, sum };
}
