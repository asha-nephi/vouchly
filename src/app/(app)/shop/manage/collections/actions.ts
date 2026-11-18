"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/catalog";
import { myShop } from "@/lib/shops";

export type CollectionState = { error?: string; values?: { name: string; picked: string[] } } | undefined;

const MOST = 20;

async function shopOrSell() {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  return shop;
}

// Makes a new collection, or saves changes to one. The link stays the same after a rename.
export async function saveCollection(_: CollectionState, form: FormData): Promise<CollectionState> {
  const shop = await shopOrSell();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "")
    .trim()
    .slice(0, 40);
  const asked = [...new Set(form.getAll("p").map(String))].filter((p) => /^[0-9a-f-]{36}$/.test(p)).slice(0, 60);
  const fail = (error: string): CollectionState => ({ error, values: { name, picked: asked } });

  if (name.length < 2) return fail("Please give the collection a name, like Christmas gifts.");
  // Only this shop's own listings, kept in the order they were ticked.
  const mine = asked.length
    ? await db
        .select({ id: products.id })
        .from(products)
        .where(and(inArray(products.id, asked), eq(products.shopId, shop.id), eq(products.removed, false)))
    : [];
  const ok = new Set(mine.map((m) => m.id));
  const productIds = asked.filter((p) => ok.has(p));
  if (!productIds.length) return fail("Please tick at least one listing to go in it.");

  const all = await db.select({ id: collections.id, slug: collections.slug }).from(collections).where(eq(collections.shopId, shop.id));
  if (id) {
    if (!all.some((c) => c.id === id)) return fail("We couldn't find that collection.");
    await db
      .update(collections)
      .set({ name, productIds })
      .where(and(eq(collections.id, id), eq(collections.shopId, shop.id)));
  } else {
    if (all.length >= MOST) return fail(`You can have up to ${MOST} collections. Delete one you don't use first.`);
    const base = slugify(name) === "shop" ? "collection" : slugify(name);
    let slug = base;
    for (let n = 2; all.some((c) => c.slug === slug); n++) slug = `${base}-${n}`;
    await db.insert(collections).values({ shopId: shop.id, name, slug, productIds });
  }
  revalidatePath("/shop/manage/collections");
  revalidatePath(`/s/${shop.slug}`);
  redirect("/shop/manage/collections?saved=1");
}

export async function deleteCollection(form: FormData): Promise<void> {
  const shop = await shopOrSell();
  const id = String(form.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/.test(id)) await db.delete(collections).where(and(eq(collections.id, id), eq(collections.shopId, shop.id)));
  revalidatePath("/shop/manage/collections");
  revalidatePath(`/s/${shop.slug}`);
  redirect("/shop/manage/collections?deleted=1");
}
