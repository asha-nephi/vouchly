"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, shops } from "@/db/schema";
import { currentUser, makeToken, requireBuyer } from "@/lib/auth";
import { buyerFor, guestValues } from "@/lib/guest";
import { discountFor } from "@/lib/discounts";
import { takenNights } from "@/lib/bookings";
import { AREAS, naira } from "@/lib/catalog";
import { addDays, isDayKey, keyToDate, nightsBetween, nightsOf, shortDay, todayKey, weekday } from "@/lib/dates";
import { durationLabel, TIME_SLOTS } from "@/lib/listings";
import { lagosAt, sessionSlots, ticketsTaken } from "@/lib/sessions";
import { notify } from "@/lib/notify";
import { holdMode } from "@/lib/orders";
import { paystackReady } from "@/lib/paystack";
import { newOrderCode, startPayment } from "@/lib/start-payment";

export type BookState = { error?: string; values?: Record<string, string> } | undefined;

// The listing and its shop, if it can be booked by this person.
async function bookable(productId: string, kind: "stay" | "service", userId: string | undefined) {
  const [row] = await db
    .select({ p: products, shop: shops })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, productId), eq(products.kind, kind), eq(products.isActive, true), eq(products.removed, false)))
    .limit(1);
  if (!row) return { error: "This listing isn't available any more." };
  if (!row.shop.isOpen) return { error: "This shop is closed for now." };
  if (userId && row.shop.ownerId === userId) return { error: "You can't book your own listing." };
  if (!holdMode() && !row.shop.paystackSubaccount) return { error: `${row.shop.name} hasn't set up payments yet, so they can't take bookings.` };
  return row;
}

export async function bookStay(_: BookState, form: FormData): Promise<BookState> {
  const me = await currentUser();
  const values = {
    checkIn: String(form.get("checkIn") ?? ""),
    checkOut: String(form.get("checkOut") ?? ""),
    guests: String(form.get("guests") ?? "1"),
    note: String(form.get("note") ?? "").trim().slice(0, 300),
    discount: String(form.get("discount") ?? ""),
    ...guestValues(form),
  };
  const fail = (error: string): BookState => ({ error, values });
  const found = await bookable(String(form.get("productId") ?? ""), "stay", me?.id);
  if ("error" in found) return fail(found.error!);
  const { p, shop } = found;

  const { checkIn, checkOut } = values;
  if (!isDayKey(checkIn) || !isDayKey(checkOut)) return fail("Please pick your check-in and check-out dates.");
  if (checkIn < todayKey()) return fail("Check-in can't be in the past.");
  if (checkIn > addDays(todayKey(), 365)) return fail("You can book up to a year ahead.");
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return fail("Check-out must be after check-in.");
  if (nights < p.minNights) return fail(`The shortest stay here is ${p.minNights} nights.`);
  if (nights > 30) return fail("For stays longer than 30 nights, please message the host.");
  const guests = Number(values.guests);
  if (!Number.isInteger(guests) || guests < 1) return fail("Please say how many guests.");
  if (p.guests && guests > p.guests) return fail(`This place sleeps up to ${p.guests} guests.`);

  const taken = await takenNights(p);
  const clash = nightsOf(checkIn, checkOut).find((k) => taken.has(k));
  if (clash) return fail(`${shortDay(clash)} is already booked. Please pick other dates.`);
  if (!paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");

  const disc = await discountFor(shop.id, form.get("discount"), p.priceKobo * nights);
  if ("error" in disc) return fail(disc.error);
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;
  const itemsKobo = p.priceKobo * nights - disc.kobo;
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: keyToDate(checkIn),
      checkOut: keyToDate(checkOut),
      guests,
      method: "check_in",
      note: values.note || null,
      itemsKobo,
      discountCode: disc.code,
      discountKobo: disc.kobo,
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values({ orderId: order.id, productId: p.id, name: p.name, size: nights === 1 ? "1 night" : `${nights} nights`, quantity: nights, priceKobo: p.priceKobo });
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo, totalKobo: itemsKobo });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}

export async function bookService(_: BookState, form: FormData): Promise<BookState> {
  const me = await currentUser();
  const values = {
    day: String(form.get("day") ?? ""),
    slot: String(form.get("slot") ?? ""),
    area: String(form.get("area") ?? ""),
    address: String(form.get("address") ?? "").trim().slice(0, 200),
    details: String(form.get("details") ?? "").trim().slice(0, 1000),
    discount: String(form.get("discount") ?? ""),
    ...guestValues(form),
  };
  const fail = (error: string): BookState => ({ error, values });
  const found = await bookable(String(form.get("productId") ?? ""), "service", me?.id);
  if ("error" in found) return fail(found.error!);
  const { p, shop } = found;

  if (!isDayKey(values.day) || values.day <= todayKey() || values.day > addDays(todayKey(), 60)) return fail("Please pick a day for the visit.");
  if (!p.workDays.includes(weekday(values.day))) return fail(`${shop.name} doesn't work on that day.`);
  if (!TIME_SLOTS.some((t) => t.key === values.slot)) return fail("Please pick a time.");
  if (!AREAS.includes(values.area as (typeof AREAS)[number])) return fail("Please pick your area.");
  if (p.serviceAreas.length && !p.serviceAreas.includes(values.area)) return fail(`${shop.name} doesn't cover ${values.area} yet.`);
  if (values.address.length < 6) return fail("Please add the address for the visit.");
  if (values.details.length < 5) return fail("Please describe the job in a few words.");

  const quote = p.priceType === "quote";
  if (!quote && !paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");
  const disc = quote ? { kobo: 0, code: null } : await discountFor(shop.id, form.get("discount"), p.priceKobo);
  if ("error" in disc) return fail(disc.error);
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;
  const itemsKobo = quote ? 0 : p.priceKobo - disc.kobo;
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: keyToDate(values.day),
      timeSlot: values.slot,
      method: "visit",
      address: `${values.address}, ${values.area}`,
      note: values.details,
      itemsKobo,
      discountCode: disc.code,
      discountKobo: disc.kobo,
      status: quote ? "requested" : "awaiting_payment",
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values({ orderId: order.id, productId: p.id, name: p.name, size: p.priceUnit, quantity: 1, priceKobo: itemsKobo });

  if (quote) {
    await notify(shop.ownerId, "New quote request", `${user.name} needs “${p.name}” on ${shortDay(values.day)}. Send them a price.`, `/shop/manage/orders/${code}`);
    redirect(`/orders/${code}?placed=1`);
  }
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo, totalKobo: itemsKobo });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}

// Buy a digital product. Free ones are delivered at once without payment.
export async function buyDigital(_: BookState, form: FormData): Promise<BookState> {
  const me = await currentUser();
  const values = { discount: String(form.get("discount") ?? ""), ...guestValues(form) };
  const fail = (error: string): BookState => ({ error, values });
  const [row] = await db
    .select({ p: products, shop: shops })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, String(form.get("productId") ?? "")), eq(products.kind, "digital"), eq(products.isActive, true), eq(products.removed, false)))
    .limit(1);
  if (!row || !row.p.fileId) return fail("This product isn't available any more.");
  const { p, shop } = row;
  if (!shop.isOpen) return fail("This shop is closed for now.");
  if (me && shop.ownerId === me.id) return fail("You can't buy your own product.");
  const free = p.priceKobo === 0;
  if (!free && !holdMode() && !shop.paystackSubaccount) return fail(`${shop.name} hasn't set up payments yet.`);
  if (!free && !paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");

  const disc = free ? { kobo: 0, code: null } : await discountFor(shop.id, form.get("discount"), p.priceKobo);
  if ("error" in disc) return fail(disc.error);
  const price = p.priceKobo - disc.kobo;
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: new Date(),
      method: "download",
      itemsKobo: price,
      discountCode: disc.code,
      discountKobo: disc.kobo,
      status: free ? "received" : "awaiting_payment",
      receivedAt: free ? new Date() : null,
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values({ orderId: order.id, productId: p.id, name: p.name, size: null, quantity: 1, priceKobo: p.priceKobo });
  if (free) {
    await notify(shop.ownerId, "New download", `${user.name} got “${p.name}” for free.`, `/shop/manage/orders/${code}`);
    redirect(`/orders/${code}?placed=1`);
  }
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo: price, totalKobo: price });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}

// The listing and shop for a session or event.
async function listing(productId: string, kind: "session" | "event") {
  const [row] = await db
    .select({ p: products, shop: shops })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, productId), eq(products.kind, kind), eq(products.isActive, true), eq(products.removed, false)))
    .limit(1);
  return row ?? null;
}

// Book a 1-on-1 session at a free time.
export async function bookSession(_: BookState, form: FormData): Promise<BookState> {
  const me = await currentUser();
  const values = { day: String(form.get("day") ?? ""), time: String(form.get("time") ?? ""), note: String(form.get("note") ?? "").trim().slice(0, 500), discount: String(form.get("discount") ?? ""), ...guestValues(form) };
  const fail = (error: string): BookState => ({ error, values });
  const row = await listing(String(form.get("productId") ?? ""), "session");
  if (!row) return fail("This session isn't available any more.");
  const { p, shop } = row;
  if (!shop.isOpen) return fail("This shop is closed for now.");
  if (me && shop.ownerId === me.id) return fail("You can't book your own session.");
  if (!holdMode() && !shop.paystackSubaccount) return fail(`${shop.name} hasn't set up payments yet.`);
  if (!paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");
  // The time must still be one of the open slots.
  const open = await sessionSlots(p);
  if (!open.some((d) => d.day === values.day && d.times.includes(values.time))) return fail("That time was just taken. Please pick another.");

  const disc = await discountFor(shop.id, form.get("discount"), p.priceKobo);
  if ("error" in disc) return fail(disc.error);
  const price = p.priceKobo - disc.kobo;
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: lagosAt(values.day, values.time),
      timeSlot: values.time,
      method: "session",
      note: values.note || null,
      itemsKobo: price,
      discountCode: disc.code,
      discountKobo: disc.kobo,
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values({ orderId: order.id, productId: p.id, name: p.name, size: durationLabel(p.durationMins), quantity: 1, priceKobo: p.priceKobo });
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo: price, totalKobo: price });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}

// Tickets for a class or event. Free events reserve seats without payment.
export async function buyTickets(_: BookState, form: FormData): Promise<BookState> {
  const me = await currentUser();
  const values = { qty: String(form.get("qty") ?? "1"), discount: String(form.get("discount") ?? ""), ...guestValues(form) };
  const fail = (error: string): BookState => ({ error, values });
  const row = await listing(String(form.get("productId") ?? ""), "event");
  if (!row || !row.p.eventAt || !row.p.seats) return fail("This event isn't available any more.");
  const { p, shop } = row;
  if (p.eventAt!.getTime() < Date.now()) return fail("This event has already started.");
  if (!shop.isOpen) return fail("This shop is closed for now.");
  if (me && shop.ownerId === me.id) return fail("You can't buy tickets to your own event.");
  const free = p.priceKobo === 0;
  if (!free && !holdMode() && !shop.paystackSubaccount) return fail(`${shop.name} hasn't set up payments yet.`);
  if (!free && !paystackReady()) return fail("Payments aren't switched on yet. Please try again later.");
  const qty = Number(values.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) return fail("You can get 1 to 10 tickets at a time.");
  const left = p.seats! - (await ticketsTaken(p.id));
  if (left <= 0) return fail("Sorry, this event is sold out.");
  if (qty > left) return fail(`Only ${left} ${left === 1 ? "seat is" : "seats are"} left.`);

  const disc = free ? { kobo: 0, code: null } : await discountFor(shop.id, form.get("discount"), p.priceKobo * qty);
  if ("error" in disc) return fail(disc.error);
  const who = await buyerFor(form);
  if ("error" in who) return fail(who.error);
  const user = who.user;
  const itemsKobo = p.priceKobo * qty - disc.kobo;
  const code = await newOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken: makeToken(),
      buyerId: user.id,
      shopId: shop.id,
      deliveryDay: p.eventAt!,
      method: "event",
      itemsKobo,
      discountCode: disc.code,
      discountKobo: disc.kobo,
      status: free ? "ready" : "awaiting_payment",
    })
    .returning({ id: orders.id });
  await db.insert(orderItems).values({ orderId: order.id, productId: p.id, name: p.name, size: qty === 1 ? "1 ticket" : `${qty} tickets`, quantity: qty, priceKobo: p.priceKobo });
  if (free) {
    await notify(shop.ownerId, "New sign-up", `${user.name} reserved ${qty === 1 ? "a seat" : `${qty} seats`} for “${p.name}”.`, `/shop/manage/orders/${code}`);
    redirect(`/orders/${code}?placed=1`);
  }
  const pay = await startPayment({ user, shop, orderId: order.id, code, itemsKobo, totalKobo: itemsKobo });
  if (!pay.url) return fail(pay.error!);
  redirect(pay.url);
}

// Buyer pays the price the seller quoted.
export async function payQuote(_: BookState, form: FormData): Promise<BookState> {
  const user = await requireBuyer();
  const code = String(form.get("code") ?? "");
  const [row] = await db
    .select({ order: orders, shop: shops })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id)))
    .limit(1);
  if (!row || row.order.status !== "quoted") return { error: "This quote can't be paid now." };
  if (row.order.deliveryDay.getTime() < Date.now()) return { error: "The visit day has passed. Please ask for a new date." };
  if (!holdMode() && !row.shop.paystackSubaccount) return { error: `${row.shop.name} hasn't set up payments yet.` };
  if (!paystackReady()) return { error: "Payments aren't switched on yet. Please try again later." };
  const pay = await startPayment({
    user,
    shop: row.shop,
    orderId: row.order.id,
    code,
    itemsKobo: row.order.itemsKobo,
    totalKobo: row.order.itemsKobo,
    cancelOnFail: false,
  });
  if (!pay.url) return { error: pay.error };
  redirect(pay.url);
}

// Buyer cancels a request, or says no to a quote. Nothing was paid yet.
export async function dropRequest(form: FormData): Promise<void> {
  const user = await requireBuyer();
  const code = String(form.get("code") ?? "");
  const [row] = await db
    .select({ order: orders, shop: shops })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id)))
    .limit(1);
  if (!row || !["requested", "quoted"].includes(row.order.status)) return;
  await db.update(orders).set({ status: "cancelled", cancelReason: "You cancelled the request", cancelledAt: new Date() }).where(eq(orders.id, row.order.id));
  await notify(row.shop.ownerId, "Request cancelled", `${user.name} cancelled request ${code}${row.order.itemsKobo ? ` (quote ${naira(row.order.itemsKobo)})` : ""}.`, `/shop/manage/orders/${code}`);
  revalidatePath(`/orders/${code}`);
}
