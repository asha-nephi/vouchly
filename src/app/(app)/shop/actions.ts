"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, products, shops } from "@/db/schema";
import { notify } from "@/lib/notify";
import { requireUser } from "@/lib/auth";
import { AREAS, CATEGORIES, CUTOFF_TIMES, DAY_KEYS, slugify, toKobo, type CategoryId } from "@/lib/catalog";
import { filesFrom, isOurPhoto, savePhoto } from "@/lib/photos";
import { AMENITIES, CHECK_TIMES } from "@/lib/listings";
import { saveFile } from "@/lib/files";
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
  // Stays and repair services don't deliver, so they skip the delivery step.
  if (["stays", "repairs", "home_care"].includes(category)) redirect("/shop/manage/products/new?first=1");
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
  const str = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const kind = (["item", "stay", "service", "digital", "session", "event"] as const).find((k) => k === form.get("kind")) ?? "item";
  const name = str("name", 80);
  const priceType = kind === "service" && form.get("priceType") === "quote" ? "quote" : "fixed";
  const on = (k: string) => form.get(k) === "on";
  const amenities = AMENITIES.filter((a) => on(`amenity:${a}`));
  const serviceAreas = AREAS.filter((a) => on(`servicearea:${a}`));
  const workDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => on(`workday:${d}`));
  // New products have no switch, so they start shown.
  const activeVals = form.getAll("isActive").map(String);
  const isActive = activeVals.length === 0 || activeVals.includes("on");
  const values: Record<string, string> = {
    kind,
    name,
    price: str("price", 20),
    size: str("size", 40),
    sellMode: form.get("sellMode") === "in_stock" ? "in_stock" : "preorder",
    maxPerDay: str("maxPerDay", 6),
    about: str("about", 1500),
    rules: str("rules", 1000),
    privateAddress: str("privateAddress", 200),
    guests: str("guests", 3),
    bedrooms: str("bedrooms", 3),
    bathrooms: str("bathrooms", 3),
    minNights: str("minNights", 3),
    checkInTime: str("checkInTime", 5),
    checkOutTime: str("checkOutTime", 5),
    priceType,
    priceUnit: str("priceUnit", 30),
    amenities: amenities.join("|"),
    serviceAreas: serviceAreas.join("|"),
    workDays: workDays.join("|"),
    online: form.get("online") === "off" ? "off" : "on",
    meetingLink: str("meetingLink", 300),
    durationMins: str("durationMins", 4),
    startHour: str("startHour", 5),
    endHour: str("endHour", 5),
    eventDate: str("eventDate", 10),
    eventTime: str("eventTime", 5),
    seats: str("seats", 5),
  };
  const fail = (error: string): ShopFormState => ({ error, values });
  const count = (k: string, label: string, max: number, need = true) => {
    if (!values[k]) return need ? `Please add the number of ${label}.` : null;
    const n = Number(values[k]);
    return Number.isInteger(n) && n >= 1 && n <= max ? null : `The number of ${label} should be from 1 to ${max}.`;
  };

  if (name.length < 2) return fail(kind === "item" ? "Please enter the product name." : "Please give your listing a name.");
  const priceKobo =
    kind === "service" && priceType === "quote"
      ? 0
      : (kind === "digital" || kind === "event") && values.price.replace(/[₦,\s]/g, "") === "0"
        ? 0
        : toKobo(values.price);
  if (priceKobo === null) return fail("Please enter a price in naira, like 2500.");

  const maxPerDay = kind === "item" && values.maxPerDay ? Number(values.maxPerDay) : null;
  if (maxPerDay !== null && (!Number.isInteger(maxPerDay) || maxPerDay < 1)) return fail("The most per day must be a whole number, like 20.");
  if (kind === "stay") {
    const bad = count("guests", "guests", 30) ?? count("bedrooms", "bedrooms", 20) ?? count("bathrooms", "bathrooms", 20) ?? count("minNights", "nights", 30, false);
    if (bad) return fail(bad);
    if (values.privateAddress.length < 6) return fail("Please add the full address. Only guests with an accepted booking see it.");
  }
  if (kind === "service" && !workDays.length) return fail("Please pick at least one day you work.");
  if (kind === "digital" && values.about.length < 10) return fail("Please say what's inside, so buyers know what they get.");

  // Sessions and events
  const online = values.online === "on";
  const durationMins = Number(values.durationMins) || null;
  let eventAt: Date | null = null;
  if (kind === "session" || kind === "event") {
    if (values.about.length < 10) return fail(kind === "session" ? "Please say what you'll cover in a session." : "Please say what the event is about.");
    if (online && values.meetingLink && !/^https:\/\/\S+$/.test(values.meetingLink)) return fail("The meeting link should start with https://");
    if (!online && values.privateAddress.length < 6) return fail("Please add the address. Only people who booked see it.");
    if (!durationMins || durationMins < 15 || durationMins > 600) return fail("Please pick how long it lasts.");
  }
  if (kind === "session") {
    if (!workDays.length) return fail("Please pick at least one day you're free.");
    if (!values.startHour || !values.endHour || values.endHour <= values.startHour) return fail("Your finish time must be after your start time.");
    const [sh, sm] = values.startHour.split(":").map(Number);
    const [eh, em] = values.endHour.split(":").map(Number);
    if (eh * 60 + em - (sh * 60 + sm) < durationMins!) return fail("Your free hours are shorter than one session.");
  }
  if (kind === "event") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.eventDate) || !/^\d{2}:\d{2}$/.test(values.eventTime)) return fail("Please pick the date and start time.");
    eventAt = new Date(Date.parse(`${values.eventDate}T${values.eventTime}:00+01:00`));
    if (Number.isNaN(eventAt.getTime()) || eventAt.getTime() < Date.now()) return fail("The event date must be in the future.");
    const seats = Number(values.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 5000) return fail("Please add how many seats, from 1 to 5000.");
  }

  // The digital file: a new upload, or keep the one already there.
  const upload = form.get("file");
  const [existing] = id ? await db.select({ fileId: products.fileId, fileName: products.fileName, fileSize: products.fileSize }).from(products).where(and(eq(products.id, id), eq(products.shopId, shop.id))).limit(1) : [];
  let file = existing?.fileId ? { id: existing.fileId, name: existing.fileName ?? "", bytes: existing.fileSize ?? 0 } : null;
  const newUpload = kind === "digital" && upload instanceof File && upload.size > 0 ? upload : null;
  if (kind === "digital" && !newUpload && !file) return fail("Please add the file buyers will download.");

  const kept = form.getAll("keep").map(String).filter(isOurPhoto);
  const most = kind === "stay" ? 6 : 3;
  const added: string[] = [];
  try {
    for (const f of filesFrom(form, "photos").slice(0, Math.max(0, most - kept.length))) added.push(await savePhoto(user.id, f));
  } catch (e) {
    return fail((e as Error).message);
  }
  const photos = [...kept, ...added].slice(0, most);
  if (!photos.length) return fail("Please add at least one photo. Buyers trust what they can see.");

  // Store the file last, once everything else is fine.
  if (newUpload) {
    try {
      file = await saveFile(user.id, newUpload);
    } catch (e) {
      return fail((e as Error).message);
    }
  }

  const n = (k: string) => (values[k] ? Number(values[k]) : null);
  const data = {
    kind,
    name,
    priceKobo,
    photos,
    isActive,
    about: values.about || null,
    size: kind === "item" ? values.size || null : null,
    sellMode: values.sellMode as "preorder" | "in_stock",
    maxPerDay,
    guests: kind === "stay" ? n("guests") : null,
    bedrooms: kind === "stay" ? n("bedrooms") : null,
    bathrooms: kind === "stay" ? n("bathrooms") : null,
    minNights: kind === "stay" ? (n("minNights") ?? 1) : 1,
    amenities: kind === "stay" ? amenities : [],
    checkInTime: kind === "stay" && CHECK_TIMES.includes(values.checkInTime as never) ? values.checkInTime : null,
    checkOutTime: kind === "stay" && CHECK_TIMES.includes(values.checkOutTime as never) ? values.checkOutTime : null,
    rules: kind === "stay" ? values.rules || null : null,
    privateAddress: kind === "stay" || ((kind === "session" || kind === "event") && !online) ? values.privateAddress : null,
    priceType,
    priceUnit: kind === "service" && priceType === "fixed" ? values.priceUnit || null : null,
    serviceAreas: kind === "service" ? serviceAreas : [],
    workDays: kind === "service" || kind === "session" ? workDays : [1, 2, 3, 4, 5, 6],
    online,
    durationMins: kind === "session" || kind === "event" ? durationMins : null,
    startHour: kind === "session" ? values.startHour : null,
    endHour: kind === "session" ? values.endHour : null,
    eventAt,
    seats: kind === "event" ? Number(values.seats) : null,
    meetingLink: (kind === "session" || kind === "event") && online ? values.meetingLink || null : null,
    fileId: kind === "digital" ? file!.id : null,
    fileName: kind === "digital" ? file!.name : null,
    fileSize: kind === "digital" ? file!.bytes : null,
  } as const;
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

// Host blocks or frees nights on a stay's calendar.
export async function saveBlockedDates(form: FormData): Promise<void> {
  const { shop } = await requireShop();
  const id = String(form.get("id") ?? "");
  const dates = String(form.get("dates") ?? "")
    .split(",")
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .slice(0, 400);
  await db
    .update(products)
    .set({ blockedDates: [...new Set(dates)].sort() })
    .where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.kind, "stay")));
  revalidatePath(`/shop/manage/products/${id}/calendar`);
  redirect(`/shop/manage/products/${id}/calendar?saved=1`);
}

// Sends one message to everyone with a ticket to an event.
export async function messageAttendees(_: ShopFormState, form: FormData): Promise<ShopFormState> {
  const { shop } = await requireShop();
  const id = String(form.get("id") ?? "");
  const text = String(form.get("message") ?? "").trim().slice(0, 600);
  if (text.length < 3) return { error: "Please write your message.", values: { message: text } };
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.kind, "event"))).limit(1);
  if (!p) return { error: "We couldn't find that event." };
  const buyers = await db
    .selectDistinct({ id: orders.buyerId, code: orders.code })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.productId, p.id), eq(orders.method, "event"), inArray(orders.status, ["ready", "received", "disputed"])));
  for (const b of buyers) await notify(b.id, `${p.name}: message from ${shop.name}`, text, `/orders/${b.code}`);
  return { values: { sent: String(buyers.length) } };
}
