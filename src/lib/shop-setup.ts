import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, shops } from "@/db/schema";

// How many must-do setup jobs are left: a live listing and a bank account.
export async function setupLeft(userId: string): Promise<{ noShop: boolean; left: number }> {
  const [row] = await db
    .select({
      payout: shops.paystackSubaccount,
      live: sql<number>`(select count(*)::int from ${products} p where p.shop_id = ${shops.id} and p.is_active and not p.removed)`,
    })
    .from(shops)
    .where(and(eq(shops.ownerId, userId)))
    .limit(1);
  if (!row) return { noShop: true, left: 0 };
  return { noShop: false, left: (row.live > 0 ? 0 : 1) + (row.payout ? 0 : 1) };
}
