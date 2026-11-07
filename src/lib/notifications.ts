import "server-only";
import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

// Unread count, looked up once per page.
export const unreadCount = cache(async (userId: string) => {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return row?.n ?? 0;
});

// Only links inside Vouchly are followed.
export const safeLink = (link: string | null) => (link && link.startsWith("/") && !link.startsWith("//") ? link : "/notifications");
