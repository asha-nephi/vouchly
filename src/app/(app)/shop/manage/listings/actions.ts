"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { currentMember } from "@/lib/auth";
import { toKobo } from "@/lib/catalog";
import { copyListing } from "@/lib/copy-listing";
import { myShop } from "@/lib/shops";
import { wakeWaitlist } from "@/lib/stock";
import { toCsv } from "@/components/data/csv";
import { runEach, type BulkResult } from "@/components/data/bulk";
import { getColumns } from "@/components/data/views";
import { loadListings } from "./listings-query";
import { LISTING_COLUMN_IDS, LISTING_COLUMNS, LISTING_DEFAULT, LISTINGS_PAGE } from "./listing-columns";

export type EditResult = { error?: string; text?: string };

const IN_COLLECTION = 60;
const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

async function shop() {
  const me = await currentMember();
  return me ? myShop(me.id) : null;
}

function redraw(slug: string, ids: string[] = []) {
  revalidatePath("/shop/manage");
  revalidatePath(LISTINGS_PAGE);
  revalidatePath("/shop/manage/collections", "layout");
  revalidatePath(`/s/${slug}`);
  for (const id of ids.slice(0, 20)) revalidatePath(`/p/${id}`);
}

async function mine(shopId: string, id: string) {
  if (!isId(id)) return null;
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.shopId, shopId), eq(products.removed, false)))
    .limit(1);
  return p ?? null;
}

// Price typed in the table row.
export async function setPrice(id: string, text: string): Promise<EditResult> {
  const s = await shop();
  if (!s) return { error: "Please log in again." };
  const p = await mine(s.id, id);
  if (!p) return { error: "We couldn't find that listing." };
  if (p.kind === "service" && p.priceType === "quote") return { error: "This price is agreed in a chat. Open the listing to change it." };
  const raw = String(text ?? "").slice(0, 20);
  const free = (p.kind === "digital" || p.kind === "event") && raw.replace(/[₦,\s]/g, "") === "0";
  const kobo = free ? 0 : toKobo(raw);
  if (kobo === null) return { error: "Enter a price in naira, like 2500." };
  await db.update(products).set({ priceKobo: kobo, updatedAt: new Date() }).where(eq(products.id, p.id));
  redraw(s.slug, [p.id]);
  return { text: "Price saved." };
}

// Stock typed in the table row. Empty means no limit.
export async function setStock(id: string, text: string): Promise<EditResult> {
  const s = await shop();
  if (!s) return { error: "Please log in again." };
  const p = await mine(s.id, id);
  if (!p) return { error: "We couldn't find that listing." };
  if (p.kind !== "item") return { error: "Only products have stock." };
  const raw = String(text ?? "").trim();
  const stock = raw === "" ? null : Number(raw);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)) return { error: "Use a whole number, like 12. Use 0 if you've run out." };
  await db.update(products).set({ stock, updatedAt: new Date() }).where(eq(products.id, p.id));
  if (stock !== 0) await wakeWaitlist(p.id).catch((e) => console.error("Waitlist not told:", (e as Error).message));
  redraw(s.slug, [p.id]);
  return { text: "Stock saved." };
}

// The on/off switch in the row.
export async function setActive(id: string, on: boolean): Promise<EditResult> {
  const s = await shop();
  if (!s) return { error: "Please log in again." };
  const p = await mine(s.id, id);
  if (!p) return { error: "We couldn't find that listing." };
  await db.update(products).set({ isActive: !!on, updatedAt: new Date() }).where(eq(products.id, p.id));
  if (on) await wakeWaitlist(p.id).catch((e) => console.error("Waitlist not told:", (e as Error).message));
  redraw(s.slug, [p.id]);
  return { text: on ? "Buyers can see it now." : "Hidden from buyers." };
}

// Bulk actions: each listing is checked on its own, so one bad row doesn't stop the rest.
async function bulk(ids: string[], fn: (shopId: string, p: typeof products.$inferSelect) => Promise<string | null>): Promise<BulkResult> {
  const s = await shop();
  const list = Array.isArray(ids) ? ids.filter(isId).slice(0, 100) : [];
  if (!s) return { done: 0, total: list.length, failed: list.map((id) => ({ id, label: "Listing", error: "Please log in again." })) };
  const rows = list.length
    ? await db
        .select()
        .from(products)
        .where(and(inArray(products.id, list), eq(products.shopId, s.id), eq(products.removed, false)))
    : [];
  const name = (id: string) => rows.find((r) => r.id === id)?.name ?? "Listing";
  const res = await runEach(list, name, async (id) => {
    const p = rows.find((r) => r.id === id);
    return p ? fn(s.id, p) : "Not found in your shop.";
  });
  redraw(s.slug, list);
  return res;
}

export async function bulkOn(ids: string[]) {
  return bulk(ids, async (_, p) => {
    if (p.isActive) return null;
    await db.update(products).set({ isActive: true, updatedAt: new Date() }).where(eq(products.id, p.id));
    await wakeWaitlist(p.id).catch(() => null);
    return null;
  });
}

export async function bulkOff(ids: string[]) {
  return bulk(ids, async (_, p) => {
    if (!p.isActive) return null;
    await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, p.id));
    return null;
  });
}

// Copies start hidden, like the Copy button on each card.
export async function bulkCopy(ids: string[]) {
  return bulk((Array.isArray(ids) ? ids : []).slice(0, 20), async (shopId, p) => ((await copyListing(shopId, p.id)) ? null : "Couldn't copy it."));
}

export async function bulkAddTo(ids: string[], collectionId?: string) {
  const s = await shop();
  const [c] =
    s && isId(collectionId)
      ? await db
          .select()
          .from(collections)
          .where(and(eq(collections.id, collectionId), eq(collections.shopId, s.id)))
          .limit(1)
      : [];
  if (!c) return { done: 0, total: ids.length, failed: ids.slice(0, 100).map((id) => ({ id, label: "Listing", error: "We couldn't find that collection." })) };
  const now = [...c.productIds];
  const res = await bulk(ids, async (_, p) => {
    if (now.includes(p.id)) return null;
    if (now.length >= IN_COLLECTION) return `${c.name} is full (${IN_COLLECTION} listings).`;
    now.push(p.id);
    return null;
  });
  if (now.length !== c.productIds.length) await db.update(collections).set({ productIds: now }).where(eq(collections.id, c.id));
  revalidatePath("/shop/manage/collections", "layout");
  return res;
}

// Inside one collection: take the ticked listings out. The listings themselves stay.
export async function bulkRemoveFrom(collectionId: string, ids: string[]) {
  const s = await shop();
  const [c] =
    s && isId(collectionId)
      ? await db
          .select()
          .from(collections)
          .where(and(eq(collections.id, collectionId), eq(collections.shopId, s.id)))
          .limit(1)
      : [];
  const list = Array.isArray(ids) ? ids.filter(isId).slice(0, 100) : [];
  if (!c || !s) return { done: 0, total: list.length, failed: list.map((id) => ({ id, label: "Listing", error: "We couldn't find that collection." })) };
  const now = c.productIds.filter((id) => !list.includes(id));
  const names = list.length
    ? await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(and(inArray(products.id, list), eq(products.shopId, s.id)))
    : [];
  const res = await runEach(
    list,
    (id) => names.find((n) => n.id === id)?.name ?? "Listing",
    async (id) => (c.productIds.includes(id) ? null : "It wasn't in this collection."),
  );
  if (now.length !== c.productIds.length) await db.update(collections).set({ productIds: now }).where(eq(collections.id, c.id));
  redraw(s.slug);
  return res;
}

// CSV of the listings the filters show (or just the ticked ones), in the seller's columns.
export async function exportListings(query: string, ids?: string[]): Promise<string | null> {
  const s = await shop();
  if (!s) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(ids) && ids.length ? ids.filter(isId).slice(0, 500) : undefined;
  const { rows } = await loadListings(s.id, sp, { all: true, ids: pick });
  const visible = await getColumns(LISTINGS_PAGE, LISTING_COLUMN_IDS, LISTING_DEFAULT);
  return toCsv(LISTING_COLUMNS, rows, visible);
}
