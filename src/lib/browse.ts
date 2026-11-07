import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, reviews, shops, users } from "@/db/schema";

export type ShopCard = {
  id: string;
  slug: string;
  name: string;
  category: string;
  area: string;
  ward: string;
  photo: string | null;
  productCount: number;
  fromKobo: number | null; // null when every listing is priced after a chat
  kinds: string[]; // item, stay, service
  deliveryDays: number[];
  servesArea: boolean; // lives in, or drops off in, the buyer's area
  rating: number | null; // average stars
  reviewCount: number;
};

// Open shops that have at least one product to sell.
async function listShops(opts: { area: string; category?: string; q?: string; limit?: number }): Promise<ShopCard[]> {
  const q = opts.q?.trim();
  const like = q ? `%${q.replace(/[%_]/g, "")}%` : null;

  const productMatch = like
    ? sql`exists (select 1 from ${products} p where p.shop_id = ${shops.id} and p.is_active and not p.removed and p.name ilike ${like})`
    : sql`true`;

  const rows = await db
    .select({
      id: shops.id,
      slug: shops.slug,
      name: shops.name,
      category: shops.category,
      area: shops.area,
      cover: shops.coverPhoto,
      ward: users.ward,
      deliveryDays: deliverySettings.deliveryDays,
      dropOffAreas: deliverySettings.dropOffAreas,
      dropOffOn: deliverySettings.dropOffOn,
      productCount: sql<number>`count(${products.id})::int`,
      fromKobo: sql<number | null>`min(nullif(${products.priceKobo}, 0))::int`,
      kinds: sql<string[]>`array_agg(distinct ${products.kind}::text)`,
      firstPhoto: sql<string | null>`(array_agg(${products.photos}->>0 order by ${products.createdAt}))[1]`,
      rating: sql<number | null>`(select round(avg(r.stars)::numeric, 1)::float from ${reviews} r where r.shop_id = ${shops.id})`,
      reviewCount: sql<number>`(select count(*)::int from ${reviews} r where r.shop_id = ${shops.id})`,
    })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.ownerId))
    .innerJoin(products, and(eq(products.shopId, shops.id), eq(products.isActive, true), eq(products.removed, false)))
    .leftJoin(deliverySettings, eq(deliverySettings.shopId, shops.id))
    .where(
      and(
        eq(shops.isOpen, true),
        opts.category ? eq(shops.category, opts.category as typeof shops.category.enumValues[number]) : undefined,
        like ? or(ilike(shops.name, like), ilike(shops.about, like), productMatch) : undefined,
      ),
    )
    .groupBy(shops.id, users.ward, deliverySettings.shopId)
    .orderBy(asc(shops.name))
    .limit(opts.limit ?? 60);

  return rows
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      area: r.area,
      ward: r.ward,
      photo: r.cover ?? r.firstPhoto,
      productCount: r.productCount,
      fromKobo: r.fromKobo,
      kinds: r.kinds ?? ["item"],
      deliveryDays: r.deliveryDays ?? [],
      rating: r.rating,
      reviewCount: r.reviewCount,
      servesArea: r.area === opts.area || (!!r.dropOffOn && (r.dropOffAreas ?? []).includes(opts.area)),
    }))
    .sort((a, b) => Number(b.servesArea) - Number(a.servesArea));
}

export async function browse(area: string, category?: string) {
  const all = await listShops({ area, category });
  return { near: all.filter((s) => s.servesArea), more: all.filter((s) => !s.servesArea) };
}

export const searchShops = (area: string, q: string, category?: string) => listShops({ area, q, category });

// Products for a list of ids (used by the basket).
export async function productsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({ product: products, shopName: shops.name, shopSlug: shops.slug, shopOpen: shops.isOpen })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(inArray(products.id, ids));
}
