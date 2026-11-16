import "server-only";
import { and, eq, ne, asc } from "drizzle-orm";
import { db } from "@/db";
import { savedViews } from "@/db/schema";
import { currentMember } from "@/lib/auth";

export const COLUMNS = "__columns";
export const MAX_VIEWS = 5;

// A person's saved views for one page (not the column list).
export async function listViews(page: string) {
  const me = await currentMember();
  if (!me) return [];
  return db
    .select({ id: savedViews.id, name: savedViews.name, query: savedViews.query })
    .from(savedViews)
    .where(and(eq(savedViews.userId, me.id), eq(savedViews.page, page), ne(savedViews.name, COLUMNS)))
    .orderBy(asc(savedViews.createdAt));
}

// The columns a person shows on a page, in their order. Falls back to the page's default.
export async function getColumns(page: string, all: string[], fallback: string[]): Promise<string[]> {
  const me = await currentMember();
  if (!me) return fallback;
  const [row] = await db
    .select({ query: savedViews.query })
    .from(savedViews)
    .where(and(eq(savedViews.userId, me.id), eq(savedViews.page, page), eq(savedViews.name, COLUMNS)))
    .limit(1);
  const ids = row?.query.split(",").filter((id) => all.includes(id)) ?? [];
  return ids.length ? ids : fallback;
}

