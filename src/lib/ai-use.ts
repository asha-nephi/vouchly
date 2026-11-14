import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiCache, aiUsage } from "@/db/schema";
import { todayKey } from "@/lib/dates";

export type AiFeature = "writer" | "post" | "search";
export const AI_RESTING = "AI help is resting for today. Try again tomorrow, or write it yourself.";

const SELLER_DAILY = 30; // writer + posts together
const SEARCH_DAILY = 20;
const siteDaily = () => Number(process.env.AI_DAILY_LIMIT) || 300;

export type Who = { who: string; userId: string | null; ipHash: string | null };

// A signed-in person counts by account; anyone else by a hash of their IP.
export async function whoIs(userId: string | null | undefined): Promise<Who> {
  if (userId) return { who: userId, userId, ipHash: null };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(`vouchly:${ip}`).digest("hex").slice(0, 32);
  return { who: `ip:${ipHash}`, userId: null, ipHash };
}

// True while this person, and the whole site, are under today's limits.
async function underLimits(w: Who, feature: AiFeature) {
  const day = todayKey();
  const mine = feature === "search" ? ["search"] : ["writer", "post"];
  const [[me], [site]] = await Promise.all([
    db
      .select({ n: sql<number>`coalesce(sum(${aiUsage.count}), 0)::int` })
      .from(aiUsage)
      .where(and(eq(aiUsage.who, w.who), eq(aiUsage.day, day), inArray(aiUsage.feature, mine))),
    db.select({ n: sql<number>`coalesce(sum(${aiUsage.count}), 0)::int` }).from(aiUsage).where(eq(aiUsage.day, day)),
  ]);
  return me.n < (feature === "search" ? SEARCH_DAILY : SELLER_DAILY) && site.n < siteDaily();
}

async function countUse(w: Who, feature: AiFeature) {
  await db
    .insert(aiUsage)
    .values({ ...w, feature, day: todayKey(), count: 1 })
    .onConflictDoUpdate({ target: [aiUsage.who, aiUsage.feature, aiUsage.day], set: { count: sql`${aiUsage.count} + 1` } });
}

async function cacheGet(key: string) {
  const [row] = await db.select({ value: aiCache.value }).from(aiCache).where(and(eq(aiCache.key, key), gt(aiCache.expiresAt, new Date()))).limit(1);
  return row?.value ?? null;
}

async function cacheSet(key: string, value: unknown, ms: number) {
  const expiresAt = new Date(Date.now() + ms);
  await db.insert(aiCache).values({ key, value, expiresAt }).onConflictDoUpdate({ target: aiCache.key, set: { value, expiresAt } });
  // Now and then, clear out old answers.
  if (Math.random() < 0.05) await db.delete(aiCache).where(lt(aiCache.expiresAt, new Date()));
}

export const DAY_MS = 86_400_000;

// Runs one AI job: cache first, then limits, then the call. The call returns a checked value or null.
export async function useAi<T>(opts: { who: Who; feature: AiFeature; cacheKey?: string; cacheMs?: number; call: () => Promise<T | null> }): Promise<{ ok: true; value: T } | { ok: false; resting: boolean }> {
  if (opts.cacheKey) {
    const hit = await cacheGet(opts.cacheKey);
    if (hit) return { ok: true, value: hit as T };
  }
  if (!(await underLimits(opts.who, opts.feature))) return { ok: false, resting: true };
  await countUse(opts.who, opts.feature);
  const value = await opts.call();
  if (value == null) return { ok: false, resting: false };
  if (opts.cacheKey) await cacheSet(opts.cacheKey, value, opts.cacheMs ?? DAY_MS);
  return { ok: true, value };
}
