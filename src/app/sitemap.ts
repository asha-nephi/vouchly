import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, shops } from "@/db/schema";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

export const dynamic = "force-dynamic"; // always lists the current shops

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/join`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];
  // Open shops and their listings, so members' businesses can be found on Google.
  const rows = await db
    .select({ slug: shops.slug, id: products.id, created: shops.createdAt })
    .from(shops)
    .innerJoin(products, eq(products.shopId, shops.id))
    .where(and(eq(shops.isOpen, true), eq(products.isActive, true), eq(products.removed, false)))
    .catch(() => []);
  for (const slug of new Set(rows.map((r) => r.slug))) pages.push({ url: `${SITE}/s/${slug}`, changeFrequency: "daily", priority: 0.7 });
  for (const r of rows) pages.push({ url: `${SITE}/p/${r.id}`, changeFrequency: "weekly", priority: 0.6 });
  return pages;
}
