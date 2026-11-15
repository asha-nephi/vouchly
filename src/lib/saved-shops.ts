import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedShops, shops } from "@/db/schema";

// A buyer's saved shops, newest first.
export function savedShopsOf(userId: string, limit = 20) {
  return db
    .select({ id: shops.id, name: shops.name, slug: shops.slug, area: shops.area, isOpen: shops.isOpen })
    .from(savedShops)
    .innerJoin(shops, eq(shops.id, savedShops.shopId))
    .where(eq(savedShops.userId, userId))
    .orderBy(desc(savedShops.createdAt))
    .limit(limit);
}
