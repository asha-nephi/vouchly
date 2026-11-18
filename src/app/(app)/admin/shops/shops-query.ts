import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, shops, users } from "@/db/schema";
import { flat, tableState, type Params } from "@/components/data/params";
import { monthStart } from "../admin-guard";

export const SELLER_LABEL = { products: "Products", service: "Services", online: "Online" } as const;
export const STATUS_LABEL = { open: "Open", waiting: "Owner not confirmed", closed: "Closed" } as const;
const SOLD = ["paid", "confirmed", "preparing", "ready", "on_the_way", "received", "disputed"] as const;

export type ShopRow = Awaited<ReturnType<typeof loadShops>>["rows"][number];

// Every shop with its owner and this month's numbers. There are tens of shops, so this is done in memory.
export async function loadShops(sp: Params, opts: { all?: boolean; ids?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["name", "listings", "orders", "sales", "created"], sort: "created" });
  const from = monthStart();
  const [list, counts, month] = await Promise.all([
    db
      .select({ s: shops, owner: users.name, ownerId: users.id, ward: users.ward, confirmed: users.confirmed, role: users.role })
      .from(shops)
      .innerJoin(users, eq(users.id, shops.ownerId)),
    db.select({ id: products.shopId, n: sql<number>`count(*) filter (where ${products.isActive})::int`, all: sql<number>`count(*)::int` }).from(products).where(eq(products.removed, false)).groupBy(products.shopId),
    db
      .select({ id: orders.shopId, n: sql<number>`count(*)::int`, sales: sql<number>`coalesce(sum(${orders.itemsKobo} + ${orders.deliveryFeeKobo}), 0)::int` })
      .from(orders)
      .where(and(inArray(orders.status, [...SOLD]), gte(orders.createdAt, from)))
      .groupBy(orders.shopId),
  ]);
  let rows = list.map((r) => {
    const c = counts.find((x) => x.id === r.s.id);
    const m = month.find((x) => x.id === r.s.id);
    const status: keyof typeof STATUS_LABEL = r.role === "member" && !r.confirmed ? "waiting" : r.s.isOpen ? "open" : "closed";
    return { ...r, live: c?.n ?? 0, listings: c?.all ?? 0, orders: m?.n ?? 0, sales: m?.sales ?? 0, payout: !!r.s.paystackSubaccount, status };
  });
  if (opts.ids) rows = rows.filter((r) => opts.ids!.includes(r.s.id));
  if (f.type && f.type in SELLER_LABEL) rows = rows.filter((r) => r.s.sellerType === f.type);
  if (f.payout === "yes") rows = rows.filter((r) => r.payout);
  if (f.payout === "no") rows = rows.filter((r) => !r.payout);
  if (f.status && f.status in STATUS_LABEL) rows = rows.filter((r) => r.status === f.status);
  if (f.sold === "yes") rows = rows.filter((r) => r.orders > 0);
  if (f.sold === "no") rows = rows.filter((r) => r.orders === 0);
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter((r) => [r.s.name, r.s.slug, r.owner, r.ward].some((x) => x.toLowerCase().includes(q)));
  }
  const key: Record<string, (r: (typeof rows)[number]) => number | string> = {
    name: (r) => r.s.name.toLowerCase(),
    listings: (r) => r.listings,
    orders: (r) => r.orders,
    sales: (r) => r.sales,
    created: (r) => r.s.createdAt.getTime(),
  };
  const by = key[st.sort] ?? key.created;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    return x === y ? a.s.id.localeCompare(b.s.id) : (x < y ? -1 : 1) * (st.dir === "asc" ? 1 : -1);
  });
  const total = rows.length;
  const sum = { orders: rows.reduce((n, r) => n + r.orders, 0), sales: rows.reduce((n, r) => n + r.sales, 0) };
  return { st, rows: opts.all ? rows : rows.slice(st.offset, st.offset + st.per), total, sum };
}
