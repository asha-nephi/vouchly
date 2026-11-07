"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AREAS, CATEGORIES, CUTOFF_TIMES, DAY_KEYS, slugify, toKobo, type CategoryId } from "@/lib/catalog";
import { filesFrom, isOurPhoto, savePhoto } from "@/lib/photos";
import { myShop } from "@/lib/shops";

export type ShopFormState = { error?: string; values?: Record<string, string>; saved?: boolean } | undefined;

// Only confirmed members can sell.
async function requireSeller() {
  const user = await requireUser();
  if (!user.confirmed) redirect("/sell");
  return user;
}

async function requireShop() {
  const user = await requireSeller();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  return { user, shop };
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  const taken = await db.select({ slug: shops.slug }).from(shops).where(like(shops.slug, `${base}%`));
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(base)) return base;
  for (let i = 2; ; i++) if (!set.has(`${base}-${i}`)) return `${base}-${i}`;
}

export async function createShop(_: ShopFormState, form: FormData): Promise<ShopFormState> {
  const user = await requireSeller();
  if (await myShop(user.id)) redirect("/shop/manage");

  const name = String(form.get("name") ?? "").trim();
  const about = String(form.get("about") ?? "").trim();
  const category = String(form.get("category") ?? "") as CategoryId;
  const area = String(form.get("area") ?? "");
  const values = { name, about, category, area };

  if (name.length < 2) return { error: "Please give your shop a name.", values };
  if (!CATEGORIES.some((c) => c.id === category)) return { error: "Please pick what you sell.", values };
  if (!AREAS.includes(area as (typeof AREAS)[number])) return { error: "Please pick your area.", values };

  let coverPhoto: string | null = null;
  const [cover] = filesFrom(form, "cover");
  if (cover) {
    try {
      coverPhoto = await savePhoto(user.id, cover);
    } catch (e) {
      return { error: (e as Error).message, values };
    }
  }

  const [shop] = await db
    .insert(shops)
    .values({ ownerId: user.id, name, slug: await uniqueSlug(name), about: about || null, category, area, coverPhoto })
    .returning({ id: shops.id });
  await db.insert(deliverySettings).values({ shopId: shop.id, dropOffAreas: [area] });
  redirect("/shop/manage/delivery?new=1");
}

export async function updateShop(_: ShopFormState, form: FormData): Promise<ShopFormState> {
  const { user, shop } = await requireShop();
  const name = String(form.get("name") ?? "").trim();
  const about = String(form.get("about") ?? "").trim();
  const area = String(form.get("area") ?? "");
  if (name.length < 2) return { error: "Please give your shop a name." };
  if (!AREAS.includes(area as (typeof AREAS)[number])) return { error: "Please pick your area." };

  let coverPhoto = form.getAll("keepCover").map(String).filter(isOurPhoto)[0] ?? null;
  const [cover] = filesFrom(form, "cover");
  if (cover) {
    try {
      coverPhoto = await savePhoto(user.id, cover);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  await db.update(shops).set({ name, about: about || null, area, coverPhoto }).where(eq(shops.id, shop.id));
  revalidatePath("/shop/manage");
  return { saved: true };
}

export async function toggleShopOpen(): Promise<void> {
  const { shop } = await requireShop();
  await db.update(shops).set({ isOpen: !shop.isOpen }).where(eq(shops.id, shop.id));
  revalidatePath("/shop/manage");
}

export async function saveProduct(_: ShopFormState, form: FormData): Promise<ShopFormState> {
  const { user, shop } = await requireShop();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const size = String(form.get("size") ?? "").trim();
  const priceRaw = String(form.get("price") ?? "");
  const sellMode = form.get("sellMode") === "in_stock" ? "in_stock" : "preorder";
  const maxRaw = String(form.get("maxPerDay") ?? "").trim();
  // New products have no switch, so they start shown.
  const activeVals = form.getAll("isActive").map(String);
  const isActive = activeVals.length === 0 || activeVals.includes("on");
  const values = { name, size, price: priceRaw, sellMode, maxPerDay: maxRaw };

  if (name.length < 2) return { error: "Please enter the product name.", values };
  const priceKobo = toKobo(priceRaw);
  if (!priceKobo) return { error: "Please enter a price in naira, like 2500.", values };
  const maxPerDay = maxRaw ? Number(maxRaw) : null;
  if (maxPerDay !== null && (!Number.isInteger(maxPerDay) || maxPerDay < 1)) {
    return { error: "The most per day must be a whole number, like 20.", values };
  }

  const kept = form.getAll("keep").map(String).filter(isOurPhoto);
  const added: string[] = [];
  try {
    for (const f of filesFrom(form, "photos").slice(0, 3 - kept.length)) added.push(await savePhoto(user.id, f));
  } catch (e) {
    return { error: (e as Error).message, values };
  }
  const photos = [...kept, ...added].slice(0, 3);
  if (!photos.length) return { error: "Please add at least one photo. Buyers trust what they can see.", values };

  const data = { name, size: size || null, priceKobo, photos, sellMode, maxPerDay, isActive } as const;
  if (id) {
    await db.update(products).set(data).where(and(eq(products.id, id), eq(products.shopId, shop.id)));
  } else {
    await db.insert(products).values({ ...data, shopId: shop.id });
  }
  revalidatePath("/shop/manage");
  redirect("/shop/manage?saved=product");
}

export async function deleteProduct(form: FormData): Promise<void> {
  const { shop } = await requireShop();
  const id = String(form.get("id") ?? "");
  // Old orders point at products, so a removed product is hidden, not deleted.
  await db.update(products).set({ isActive: false, removed: true }).where(and(eq(products.id, id), eq(products.shopId, shop.id)));
  revalidatePath("/shop/manage");
  redirect("/shop/manage?saved=removed");
}

export async function saveDelivery(_: ShopFormState, form: FormData): Promise<ShopFormState> {
  const { shop } = await requireShop();
  const on = (k: string) => form.get(k) === "on";

  const deliveryDays = DAY_KEYS.map((_, i) => i).filter((i) => on(`day${i}`));
  const cutDay = String(form.get("cutDay") ?? "thu");
  const cutTime = String(form.get("cutTime") ?? "18:00");
  const pickupOn = on("pickupOn");
  const pickupSpot = String(form.get("pickupSpot") ?? "").trim();
  const pickupHours = String(form.get("pickupHours") ?? "").trim();
  const dropOffOn = on("dropOffOn");
  const dropOffAreas = AREAS.filter((a) => on(`area:${a}`));
  const dropFeeRaw = String(form.get("dropOffFee") ?? "").trim();
  const riderOn = on("riderOn");
  const riderPayer = form.get("riderPayer") === "fee_in_order" ? "fee_in_order" : "buyer_on_arrival";
  const riderEstimate = String(form.get("riderEstimate") ?? "").trim();
  const riderFeeRaw = String(form.get("riderFee") ?? "").trim();

  if (!deliveryDays.length) return { error: "Pick at least one delivery day." };
  if (!DAY_KEYS.includes(cutDay as (typeof DAY_KEYS)[number]) || !CUTOFF_TIMES.includes(cutTime as (typeof CUTOFF_TIMES)[number])) {
    return { error: "Please pick when orders close." };
  }
  if (!pickupOn && !dropOffOn && !riderOn) return { error: "Turn on at least one way for buyers to get their order." };
  if (pickupOn && pickupSpot.length < 3) return { error: "Please add your pickup spot, like “Allen Avenue, Ikeja”." };
  if (dropOffOn && !dropOffAreas.length) return { error: "Pick the areas you drop off in." };
  const dropOffFeeKobo = dropFeeRaw ? toKobo(dropFeeRaw) : 0;
  if (dropOffFeeKobo === null) return { error: "Drop-off fee must be a number, or leave it empty for free." };
  let riderAreaFees: Record<string, number> = {};
  if (riderOn && riderPayer === "fee_in_order") {
    const fee = toKobo(riderFeeRaw);
    if (!fee) return { error: "Please enter the rider fee you add to orders, like 2500." };
    riderAreaFees = { default: fee };
  }

  const data = {
    deliveryDays,
    orderCutoff: `${cutDay} ${cutTime}`,
    pickupOn,
    pickupSpot: pickupSpot || null,
    pickupHours: pickupHours || null,
    dropOffOn,
    dropOffAreas,
    dropOffFeeKobo,
    riderOn,
    riderPayer,
    riderEstimate: riderEstimate || "₦2,000 – ₦3,500",
    riderAreaFees,
  } as const;
  await db
    .insert(deliverySettings)
    .values({ shopId: shop.id, ...data })
    .onConflictDoUpdate({ target: deliverySettings.shopId, set: data });

  revalidatePath("/shop/manage");
  if (form.get("new") === "1") redirect("/shop/manage/products/new?first=1");
  return { saved: true };
}
