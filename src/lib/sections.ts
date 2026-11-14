import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orders, products, reviews, shops, users } from "@/db/schema";
import { addDays, dateToKey, keyToDate, todayKey, weekday } from "@/lib/dates";
import { TIME_SLOTS } from "@/lib/listings";

// The three ways buyers browse, and which listing kinds each holds.
export const SECTIONS = {
  products: { label: "Products", door: "Shop products", kinds: ["item", "stay"] },
  services: { label: "Services", door: "Hire a pro", kinds: ["service"] },
  online: { label: "Online", door: "Learn online", kinds: ["digital", "session", "event"] },
} as const;
export type Section = keyof typeof SECTIONS;
export const SECTION_IDS = Object.keys(SECTIONS) as Section[];
export const toSection = (s?: string | null): Section => (s && s in SECTIONS ? (s as Section) : "products");

// Order states that still hold a visit slot.
const DEAD = ["cancelled", "awaiting_payment"] as const;

export type Free = { key: string; label: string } | null;

// The first day a pro can still take a visit, from tomorrow, within a week.
export async function freeDays(pros: { id: string; shopId: string; workDays: number[] }[]): Promise<Map<string, Free>> {
  const out = new Map<string, Free>();
  if (!pros.length) return out;
  const tomorrow = addDays(todayKey(), 1);
  const end = addDays(tomorrow, 7);
  const rows = await db
    .select({ shopId: orders.shopId, day: orders.deliveryDay })
    .from(orders)
    .where(
      and(
        inArray(orders.shopId, [...new Set(pros.map((p) => p.shopId))]),
        eq(orders.method, "visit"),
        notInArray(orders.status, [...DEAD]),
        gte(orders.deliveryDay, keyToDate(tomorrow)),
        lt(orders.deliveryDay, keyToDate(end)),
      ),
    );
  const booked = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.shopId}|${dateToKey(r.day)}`;
    booked.set(k, (booked.get(k) ?? 0) + 1);
  }
  for (const p of pros) {
    let found: Free = null;
    for (let i = 0; i < 7 && !found; i++) {
      const key = addDays(tomorrow, i);
      if (p.workDays.includes(weekday(key)) && (booked.get(`${p.shopId}|${key}`) ?? 0) < TIME_SLOTS.length) {
        found = { key, label: i === 0 ? "Free tomorrow" : `Free ${new Intl.DateTimeFormat("en-NG", { weekday: "long", timeZone: "UTC" }).format(new Date(key + "T00:00:00Z"))}` };
      }
    }
    out.set(p.id, found);
  }
  return out;
}

// What the filter sidebar (or phone sheet) can ask for. Every value comes from the URL.
export type Filters = {
  q: string;
  cat?: string; // shop category
  when?: "tomorrow" | "week"; // services
  price?: ("fixed" | "quote")[]; // services
  r4?: boolean; // services: 4 stars and up
  sort?: "soon" | "rating" | "price";
  how?: "pickup" | "drop_off" | "rider"; // products
  pr?: "u5" | "5-20" | "o20"; // products: price band in naira thousands
  type?: "digital" | "session" | "event"; // online
  where?: "online" | "person"; // online
  date?: "week" | "month"; // online events
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(v: string | string[] | undefined, ok: readonly T[]) => (ok.includes(one(v) as T) ? (one(v) as T) : undefined);

export function readFilters(p: Params): Filters {
  const price = (Array.isArray(p.price) ? p.price : p.price ? [p.price] : []).filter((x): x is "fixed" | "quote" => x === "fixed" || x === "quote");
  return {
    q: one(p.q).trim().slice(0, 60),
    cat: one(p.cat) || undefined,
    when: pick(p.when, ["tomorrow", "week"] as const),
    price: price.length ? price : undefined,
    r4: one(p.r4) === "1",
    sort: pick(p.sort, ["soon", "rating", "price"] as const),
    how: pick(p.how, ["pickup", "drop_off", "rider"] as const),
    pr: pick(p.pr, ["u5", "5-20", "o20"] as const),
    type: pick(p.type, ["digital", "session", "event"] as const),
    where: pick(p.where, ["online", "person"] as const),
    date: pick(p.date, ["week", "month"] as const),
  };
}

// How many filters are on, for the phone "Filters" button.
export const filterCount = (f: Filters) =>
  [f.cat, f.when, f.price && f.price.length < 2 ? f.price : undefined, f.r4 || undefined, f.how, f.pr, f.type, f.where, f.date].filter(Boolean).length;

// Live listings in a section, nearest first, with what the cards need.
export async function sectionListings(section: Section, area: string, f: Filters, limit = 60) {
  const like = f.q ? `%${f.q.replace(/[%_]/g, "")}%` : null;
  const kinds = f.type && section === "online" ? [f.type] : [...SECTIONS[section].kinds];
  const near = sql<boolean>`(${shops.area} = ${area} or ${products.serviceAreas} @> ${JSON.stringify([area])}::jsonb or (coalesce(${deliverySettings.dropOffOn}, false) and ${deliverySettings.dropOffAreas} @> ${JSON.stringify([area])}::jsonb))`;
  const rating = sql<number | null>`(select round(avg(r.stars)::numeric, 1)::float from ${reviews} r where r.shop_id = ${shops.id})`;
  const now = new Date();
  const conds = [
    eq(products.isActive, true),
    eq(products.removed, false),
    eq(shops.isOpen, true),
    inArray(products.kind, kinds as (typeof products.kind.enumValues)[number][]),
    like ? or(ilike(products.name, like), ilike(products.about, like), ilike(shops.name, like)) : undefined,
    f.cat ? eq(shops.category, f.cat as (typeof shops.category.enumValues)[number]) : undefined,
    // A past event is no longer for sale.
    or(ne(products.kind, "event"), gt(products.eventAt, now)),
  ];
  if (section === "services") {
    if (f.price?.length === 1) conds.push(eq(products.priceType, f.price[0]));
    if (f.r4) conds.push(sql`${rating} >= 4`);
  }
  if (section === "products") {
    if (f.how === "pickup") conds.push(or(eq(products.kind, "stay"), eq(deliverySettings.pickupOn, true)));
    if (f.how === "drop_off") conds.push(eq(deliverySettings.dropOffOn, true));
    if (f.how === "rider") conds.push(eq(deliverySettings.riderOn, true));
    if (f.pr === "u5") conds.push(lt(products.priceKobo, 500_000));
    if (f.pr === "5-20") conds.push(and(gte(products.priceKobo, 500_000), lte(products.priceKobo, 2_000_000)));
    if (f.pr === "o20") conds.push(gt(products.priceKobo, 2_000_000));
  }
  if (section === "online") {
    if (f.where) conds.push(eq(products.online, f.where === "online"));
    if (f.date) conds.push(and(eq(products.kind, "event"), lt(products.eventAt, new Date(now.getTime() + (f.date === "week" ? 7 : 31) * 86_400_000))));
  }

  const rows = await db
    .select({
      product: products,
      shopName: shops.name,
      shopSlug: shops.slug,
      shopArea: shops.area,
      category: shops.category,
      ward: users.ward,
      confirmed: users.confirmed,
      deliveryDays: deliverySettings.deliveryDays,
      cutoff: deliverySettings.orderCutoff,
      rating,
      reviewCount: sql<number>`(select count(*)::int from ${reviews} r where r.shop_id = ${shops.id})`,
      near,
    })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .innerJoin(users, eq(users.id, shops.ownerId))
    .leftJoin(deliverySettings, eq(deliverySettings.shopId, shops.id))
    .where(and(...conds))
    .orderBy(
      desc(near),
      ...(f.sort === "rating" ? [sql`${rating} desc nulls last`] : f.sort === "price" ? [asc(products.priceKobo)] : []),
      section === "online" ? sql`${products.eventAt} asc nulls last` : desc(products.createdAt),
    )
    .limit(limit);
  return rows;
}
export type SectionRow = Awaited<ReturnType<typeof sectionListings>>[number];

// Pro cards: each service with the first free day. Filters and sorts by "when".
export async function proCards(area: string, f: Filters) {
  const rows = await sectionListings("services", area, f);
  const free = await freeDays(rows.map((r) => ({ id: r.product.id, shopId: r.product.shopId, workDays: r.product.workDays })));
  const tomorrow = addDays(todayKey(), 1);
  let cards = rows.map((r) => ({ ...r, free: free.get(r.product.id) ?? null }));
  if (f.when === "tomorrow") cards = cards.filter((c) => c.free?.key === tomorrow);
  if (f.when === "week") cards = cards.filter((c) => c.free);
  // Soonest free first (the default), keeping nearby pros on top.
  if (!f.sort || f.sort === "soon") cards.sort((a, b) => Number(b.near) - Number(a.near) || (a.free?.key ?? "9").localeCompare(b.free?.key ?? "9"));
  return cards;
}
export type ProCard = Awaited<ReturnType<typeof proCards>>[number];

// Counts per shop category in a section, for the "type of work" / "category" list.
export async function categoryCounts(section: Section) {
  return db
    .select({ cat: shops.category, n: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.isActive, true), eq(products.removed, false), eq(shops.isOpen, true), inArray(products.kind, [...SECTIONS[section].kinds] as (typeof products.kind.enumValues)[number][])))
    .groupBy(shops.category)
    .orderBy(desc(sql`count(*)`));
}
