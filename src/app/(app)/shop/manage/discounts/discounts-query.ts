import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, orders, users } from "@/db/schema";
import { flat, tableState, type Params } from "@/components/data/params";

export const DISCOUNT_SORTS = ["code", "used", "ends", "created"];
export const STATUS_FILTER = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
  { value: "finished", label: "Finished" },
];
export const TYPE_FILTER = [
  { value: "percent", label: "% off" },
  { value: "amount", label: "₦ off" },
];

type Code = typeof discountCodes.$inferSelect;
// Finished: past its end date, or every use taken.
export const finished = (c: Code, now = Date.now()) => (c.endsAt !== null && c.endsAt.getTime() < now) || (c.maxUses !== null && c.used >= c.maxUses);
export const statusOf = (c: Code): "on" | "off" | "finished" => (finished(c) ? "finished" : c.isActive ? "on" : "off");

export type DiscountRow = Awaited<ReturnType<typeof loadDiscounts>>["rows"][number];

// Every code in the shop with its orders, then filtered, sorted and cut to one page. Shops have few codes.
export async function loadDiscounts(shopId: string, sp: Params, opts: { all?: boolean; ids?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: DISCOUNT_SORTS, sort: "created" });
  const [list, stats] = await Promise.all([
    db.select().from(discountCodes).where(eq(discountCodes.shopId, shopId)),
    db
      .select({
        code: orders.discountCode,
        n: sql<number>`count(*)::int`,
        given: sql<number>`coalesce(sum(${orders.discountKobo}), 0)::int`,
        sales: sql<number>`coalesce(sum(${orders.itemsKobo}), 0)::int`,
      })
      .from(orders)
      .where(and(eq(orders.shopId, shopId), ne(orders.status, "awaiting_payment"), ne(orders.status, "cancelled"), sql`${orders.discountCode} is not null`))
      .groupBy(orders.discountCode),
  ]);
  const stat = new Map(stats.map((s) => [s.code, s]));
  let rows = list.map((c) => ({ c, status: statusOf(c), orders: stat.get(c.code)?.n ?? 0, given: stat.get(c.code)?.given ?? 0, sales: stat.get(c.code)?.sales ?? 0 }));
  if (opts.ids) rows = rows.filter((r) => opts.ids!.includes(r.c.id));
  if (f.status && STATUS_FILTER.some((s) => s.value === f.status)) rows = rows.filter((r) => r.status === f.status);
  if (f.type === "percent") rows = rows.filter((r) => r.c.percentOff !== null);
  if (f.type === "amount") rows = rows.filter((r) => r.c.percentOff === null);
  if (st.q) rows = rows.filter((r) => r.c.code.includes(st.q.toUpperCase()));

  // No end date sorts last; ties keep the newest first.
  const key: Record<string, (r: (typeof rows)[number]) => number | string> = {
    code: (r) => r.c.code,
    used: (r) => r.c.used,
    ends: (r) => r.c.endsAt?.getTime() ?? Infinity,
    created: (r) => r.c.createdAt.getTime(),
  };
  const by = key[st.sort] ?? key.created;
  const dir = st.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    if (x !== y) return (x < y ? -1 : 1) * dir;
    return b.c.createdAt.getTime() - a.c.createdAt.getTime() || a.c.id.localeCompare(b.c.id);
  });
  const total = rows.length;
  return { st, rows: opts.all ? rows : rows.slice(st.offset, st.offset + st.per), total };
}

// Orders that used one code, newest first.
export function ordersWithCode(shopId: string, code: string) {
  return db
    .select({ code: orders.code, at: orders.createdAt, status: orders.status, method: orders.method, buyer: users.name, guest: users.isGuest, discount: orders.discountKobo, items: orders.itemsKobo })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orders.shopId, shopId), eq(orders.discountCode, code), ne(orders.status, "awaiting_payment")))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}
