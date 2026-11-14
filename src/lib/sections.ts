import "server-only";
import { and, eq, gte, inArray, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
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
