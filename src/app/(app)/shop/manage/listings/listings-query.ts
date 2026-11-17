import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections, orderItems, orders, products, waitlist } from "@/db/schema";
import { KIND_LABEL } from "@/lib/listings";
import { flat, tableState, type Params } from "@/components/data/params";

export const LISTING_SORTS = ["name", "price", "stock", "week", "updated"];
export const KIND_FILTER = Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }));
export const STATUS_FILTER = [
  { value: "on", label: "On (buyers see it)" },
  { value: "off", label: "Off (hidden)" },
];
export const SOLD_OUT_FILTER = [
  { value: "yes", label: "Sold out or full" },
  { value: "no", label: "Can still be bought" },
];

export const SOLD_WEEK_FILTER = [
  { value: "yes", label: "Sold this week" },
  { value: "no", label: "No sales this week" },
];

const SOLD = ["paid", "confirmed", "preparing", "ready", "on_the_way", "received", "disputed"] as const;
const DAY = 86400_000;

export type ListingRow = Awaited<ReturnType<typeof loadListings>>["rows"][number];

// The shop's collections, for the filter and "Add to collection".
export const shopCollections = (shopId: string) =>
  db.select({ id: collections.id, name: collections.name, slug: collections.slug, productIds: collections.productIds }).from(collections).where(eq(collections.shopId, shopId)).orderBy(asc(collections.name));

// Every listing in the shop with its numbers, then filtered, sorted and cut to one page.
// Shops have tens of listings, not thousands, so this is done in memory.
export async function loadListings(shopId: string, sp: Params, opts: { all?: boolean; ids?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: LISTING_SORTS, sort: "updated" });
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [list, sold, cols] = await Promise.all([
    db.select().from(products).where(and(eq(products.shopId, shopId), eq(products.removed, false))),
    db
      .select({
        id: orderItems.productId,
        week: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.createdAt} >= ${weekAgo.toISOString()}::timestamptz), 0)::int`,
        all: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.shopId, shopId), inArray(orders.status, [...SOLD])))
      .groupBy(orderItems.productId),
    shopCollections(shopId),
  ]);
  const waits = list.length
    ? await db.select({ id: waitlist.productId, n: sql<number>`count(*)::int` }).from(waitlist).where(inArray(waitlist.productId, list.map((p) => p.id))).groupBy(waitlist.productId)
    : [];
  const stat = new Map(sold.map((s) => [s.id, s]));
  const wait = new Map(waits.map((w) => [w.id, w.n]));

  let rows = list.map((p) => {
    const s = stat.get(p.id);
    const seatsLeft = p.kind === "event" && p.seats ? Math.max(0, p.seats - (s?.all ?? 0)) : null;
    return {
      p,
      week: s?.week ?? 0,
      all: s?.all ?? 0,
      waiting: wait.get(p.id) ?? 0,
      seatsLeft,
      soldOut: (p.kind === "item" && p.stock === 0) || seatsLeft === 0,
      collections: cols.filter((c) => c.productIds.includes(p.id)).map((c) => ({ id: c.id, name: c.name })),
    };
  });

  if (opts.ids) rows = rows.filter((r) => opts.ids!.includes(r.p.id));
  if (f.kind && f.kind in KIND_LABEL) rows = rows.filter((r) => r.p.kind === f.kind);
  if (f.status === "on") rows = rows.filter((r) => r.p.isActive);
  if (f.status === "off") rows = rows.filter((r) => !r.p.isActive);
  if (f.soldout === "yes") rows = rows.filter((r) => r.soldOut);
  if (f.soldout === "no") rows = rows.filter((r) => !r.soldOut);
  if (f.sold === "yes") rows = rows.filter((r) => r.week > 0);
  if (f.sold === "no") rows = rows.filter((r) => r.week === 0);
  if (f.collection) rows = rows.filter((r) => r.collections.some((c) => c.id === f.collection));
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter((r) => r.p.name.toLowerCase().includes(q) || r.p.tags.some((t) => t.includes(q)));
  }

  // Stock sorts "no limit" last; ties keep the newest first.
  const stockOf = (r: (typeof rows)[number]) => (r.p.kind === "item" ? (r.p.stock ?? Infinity) : (r.seatsLeft ?? Infinity));
  const key: Record<string, (r: (typeof rows)[number]) => number | string> = {
    name: (r) => r.p.name.toLowerCase(),
    price: (r) => (r.p.priceType === "quote" ? -1 : r.p.priceKobo),
    stock: stockOf,
    week: (r) => r.week,
    updated: (r) => r.p.updatedAt.getTime(),
  };
  const by = key[st.sort] ?? key.updated;
  const dir = st.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    if (x !== y) return (x < y ? -1 : 1) * dir;
    return b.p.createdAt.getTime() - a.p.createdAt.getTime() || a.p.id.localeCompare(b.p.id);
  });

  const total = rows.length;
  return { st, rows: opts.all ? rows : rows.slice(st.offset, st.offset + st.per), total, collections: cols };
}
