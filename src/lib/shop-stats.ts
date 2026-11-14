import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, reviews } from "@/db/schema";

// Rating and finished orders for a shop. Zero means "hide it".
export async function shopStats(shopId: string) {
  const [[r], [o]] = await Promise.all([
    db
      .select({ avg: sql<number | null>`round(avg(${reviews.stars})::numeric, 1)::float`, n: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.shopId, shopId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.shopId, shopId), eq(orders.status, "received"))),
  ]);
  return { rating: r?.avg ?? null, reviews: r?.n ?? 0, orders: o?.n ?? 0 };
}
