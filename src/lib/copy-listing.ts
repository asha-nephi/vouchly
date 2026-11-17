import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

// Makes a hidden copy of one of this shop's listings. Returns the new id, or null if not found.
export async function copyListing(shopId: string, id: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.shopId, shopId), eq(products.removed, false))).limit(1);
  if (!p) return null;
  const rest: Partial<typeof p> = { ...p };
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;
  const [copy] = await db
    .insert(products)
    .values({ ...(rest as Omit<typeof p, "id" | "createdAt" | "updatedAt">), name: `${p.name} (copy)`.slice(0, 80), isActive: false })
    .returning({ id: products.id });
  return copy.id;
}
