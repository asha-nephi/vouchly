import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, shops } from "@/db/schema";
import { addDays, isDayKey, keyToDate, todayKey } from "@/lib/dates";
import { flat, tableState, type Params } from "@/components/data/params";

export const PAY_STATUS = [
  { value: "held", label: "Held" },
  { value: "released", label: "Released" },
  { value: "refunded", label: "Refunded" },
  { value: "part_refunded", label: "Part refunded" },
  { value: "pending", label: "Not finished" },
];
export const DATE_FILTER = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "thismonth", label: "This month" },
];

// Lagos day keys for the date filter: [first day, day after the last].
function range(f: Record<string, string>): [string, string] | null {
  const today = todayKey();
  const end = addDays(today, 1);
  if (f.date === "today") return [today, end];
  if (f.date === "week") return [addDays(today, -6), end];
  if (f.date === "month") return [addDays(today, -29), end];
  if (f.date === "thismonth") return [`${today.slice(0, 7)}-01`, end];
  const a = f.date_from && isDayKey(f.date_from) ? f.date_from : null;
  const b = f.date_to && isDayKey(f.date_to) ? addDays(f.date_to, 1) : null;
  if (!a && !b) return null;
  return [a ?? "2000-01-01", b ?? "2100-01-01"];
}

export const shopOptions = () => db.select({ value: shops.id, label: shops.name }).from(shops).orderBy(asc(shops.name));

export type PayRow = Awaited<ReturnType<typeof loadPayments>>["rows"][number];

// One page of payments across Vouchly, for checking against Paystack. Finished ones by default.
export async function loadPayments(sp: Params, opts: { all?: boolean; ids?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["date", "amount", "fee"], sort: "date" });
  const parts: (SQL | undefined)[] = [];
  if (f.status && PAY_STATUS.some((s) => s.value === f.status)) parts.push(eq(payments.status, f.status as "held"));
  else parts.push(sql`${payments.status} <> 'pending'`);
  const r = range(f);
  if (r) parts.push(gte(payments.createdAt, keyToDate(r[0])), lt(payments.createdAt, keyToDate(r[1])));
  if (f.shop && /^[0-9a-f-]{36}$/.test(f.shop)) parts.push(eq(orders.shopId, f.shop));
  if (st.q) parts.push(or(ilike(payments.paystackReference, `%${st.q}%`), ilike(orders.code, `%${st.q}%`)));
  if (opts.ids) parts.push(inArray(payments.id, opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]));
  const where = and(...parts);
  const col = { date: payments.createdAt, amount: payments.amountKobo, fee: payments.feeKobo }[st.sort as "date"];
  const base = db
    .select({ p: payments, code: orders.code, shop: shops.name, shopId: shops.id })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(where)
    .orderBy(st.dir === "asc" ? asc(col) : desc(col), desc(payments.createdAt), asc(payments.id));
  const [rows, [sum]] = await Promise.all([
    opts.all ? base.limit(10000) : base.limit(st.per).offset(st.offset),
    db
      .select({
        n: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::bigint`.mapWith(Number),
        fee: sql<number>`coalesce(sum(${payments.feeKobo}) filter (where ${payments.status} in ('held', 'released')), 0)::bigint`.mapWith(Number),
        refunded: sql<number>`coalesce(sum(${payments.refundedKobo}), 0)::bigint`.mapWith(Number),
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(where),
  ]);
  return { st, rows, total: sum.n, sum };
}
