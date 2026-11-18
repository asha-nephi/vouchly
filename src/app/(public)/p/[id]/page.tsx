import type { Metadata } from "next";
import { clip, shareMeta } from "@/lib/share-meta";
import { priceText } from "@/lib/listings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, reviews, shops, users, waitlist } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { AREAS, categoryLabel, cutoffLabel, dayList, naira } from "@/lib/catalog";
import { takenNights } from "@/lib/bookings";
import { addDays, todayKey, weekday } from "@/lib/dates";
import { durationLabel, eventWhen, timeLabel } from "@/lib/listings";
import { holdMode, nextDeliveryDay } from "@/lib/orders";
import { shopStats } from "@/lib/shop-stats";
import { ldJson, listingJsonLd } from "@/lib/structured";
import { initials, toneFor } from "@/lib/initials";
import ServiceBooking from "./service-booking";
import StayBooking from "./stay-booking";
import DigitalBuy from "./digital-buy";
import EventTickets from "./event-tickets";
import SessionBooking from "./session-booking";
import { sessionSlots, ticketsTaken } from "@/lib/sessions";
import { stockLeft } from "@/lib/stock";
import WaitlistBox from "@/components/waitlist-button";
import { fileLabel } from "@/lib/file-types";
import { BasketProvider, ItemBar } from "@/components/basket-controls";
import ActionBar from "@/components/action-bar";
import Gallery from "@/components/gallery";
import Protection from "@/components/protection";
import Seal from "@/components/seal";
import ShareButton from "@/components/share-button";
import TilePhoto from "@/components/tile-photo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return { title: "Not found" };
  const [row] = await db.select({ p: products, shop: shops }).from(products).innerJoin(shops, eq(shops.id, products.shopId)).where(eq(products.id, id)).limit(1);
  if (!row || row.p.removed) return { title: "Not found" };
  const { p, shop } = row;
  return shareMeta({
    title: `${p.name} · ${priceText(p)}`,
    description: clip(p.about) || `From ${shop.name}, a vouched-for seller in ${shop.area}, Lagos. Pay safely on Vouchly.`,
    path: `/p/${p.id}`,
    photo: p.photos[0],
  });
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ product: products, shop: shops, ward: users.ward, confirmed: users.confirmed })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(and(eq(products.id, id), eq(products.removed, false)))
    .limit(1);
  if (!row || (!row.product.isActive && row.shop.ownerId !== me?.id)) notFound();
  const { product: p, shop, ward, confirmed } = row;
  if (!confirmed && shop.ownerId !== me?.id && me?.role !== "admin" && me?.role !== "ward_contact") notFound();
  const [[d], basket, stats, latestReviews] = await Promise.all([
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    basketStart(),
    shopStats(shop.id),
    db
      .select({ review: reviews, name: users.name, ward: users.ward })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.shopId, shop.id))
      .orderBy(desc(reviews.createdAt))
      .limit(4),
  ]);
  const latest = latestReviews[0];
  const canBuy = shop.isOpen && p.isActive && shop.ownerId !== me?.id;
  const mine = shop.ownerId === me?.id;
  const blocked = mine
    ? "This is your listing."
    : !shop.isOpen || !p.isActive
      ? "Not available to book right now."
      : p.kind === "event" && p.eventAt && p.eventAt.getTime() < Date.now()
        ? "This event has already happened."
      : !holdMode() && !shop.paystackSubaccount && !((p.kind === "digital" || p.kind === "event") && p.priceKobo === 0)
        ? `${shop.name} hasn't set up payments yet.`
        : undefined;
  const today = todayKey();
  const taken = p.kind === "stay" ? [...(await takenNights(p))].filter((k) => k >= today) : [];
  const serviceDays: string[] = [];
  if (p.kind === "service") {
    for (let k = addDays(today, 1); serviceDays.length < 14 && k <= addDays(today, 60); k = addDays(k, 1)) if (p.workDays.includes(weekday(k))) serviceDays.push(k);
  }
  const slots = p.kind === "session" ? await sessionSlots(p) : [];
  const left = p.kind === "event" && p.seats ? p.seats - (await ticketsTaken(p.id)) : 0;
  const itemLeft = p.kind === "item" ? await stockLeft(p, me?.id) : null;
  const soldOut = (p.kind === "item" && itemLeft === 0) || (p.kind === "event" && left <= 0);
  const onList = soldOut && me ? (await db.select({ u: waitlist.userId }).from(waitlist).where(and(eq(waitlist.productId, p.id), eq(waitlist.userId, me.id))).limit(1)).length > 0 : false;
  const waitBox = <WaitlistBox productId={p.id} joined={onList} signedIn={!!me && !me.isGuest} event={p.kind === "event"} />;
  const unit = p.kind === "session" ? "a session" : p.kind === "stay" ? "a night" : p.kind === "service" ? (p.priceUnit ?? "") : (p.size ?? "");
  const price =
    p.kind === "service" && p.priceType === "quote" ? "Price after a quick chat" : (p.kind === "digital" || p.kind === "event") && p.priceKobo === 0 ? "Free" : naira(p.priceKobo);

  // "How you can get it" rows for items. `free` shows green, `side` is the grey amount.
  const ways: { title: string; body: string; free?: boolean; side?: string }[] = [];
  if (d?.pickupOn) ways.push({ title: "Pick up", body: [d.pickupSpot, d.pickupHours].filter(Boolean).join(" · ") || "Pickup spot shared after you order", free: true });
  if (d?.dropOffOn) ways.push({ title: "Seller drops it off", body: d.dropOffAreas.join(", "), free: d.dropOffFeeKobo === 0, side: d.dropOffFeeKobo ? naira(d.dropOffFeeKobo) : undefined });
  if (d?.riderOn) {
    const buyerPays = d.riderPayer === "buyer_on_arrival";
    ways.push({ title: "Rider", body: buyerPays ? "You pay the rider when it arrives" : "Rider fee is added at checkout", side: buyerPays ? `~${d.riderEstimate ?? "₦2,000 – ₦3,500"}` : undefined });
  }
  const readyDay = d && p.kind === "item" ? nextDeliveryDay(d.deliveryDays, d.orderCutoff, new Date(), p.sellMode === "in_stock") : null;
  const readyName = readyDay ? new Intl.DateTimeFormat("en-NG", { weekday: "long", timeZone: "Africa/Lagos" }).format(readyDay) : "";
  const pill =
    p.kind === "item"
      ? p.sellMode === "preorder"
        ? { text: readyName ? `Pre-order · ready ${readyName}` : "Pre-order", warm: true }
        : { text: "In stock", warm: false }
      : p.kind === "stay"
        ? { text: "Stay", warm: false }
        : p.kind === "service"
          ? { text: "Service", warm: false }
          : p.kind === "digital"
            ? { text: "Instant download", warm: false }
            : p.kind === "session"
              ? { text: ["Session", durationLabel(p.durationMins)].filter(Boolean).join(" · "), warm: false }
              : { text: eventWhen(p.eventAt) || "Event", warm: false };
  if (itemLeft !== null && itemLeft > 0 && itemLeft <= 10) pill.text += ` · Only ${itemLeft} left`;
  if (p.kind === "item" && soldOut) pill.text = "Sold out";
  const free = (p.kind === "digital" || p.kind === "event") && p.priceKobo === 0;
  const infoCard = (rows: ({ title: string; body: string } | false | null | "" | 0 | undefined)[]) => {
    const list = rows.filter((f): f is { title: string; body: string } => !!f);
    return (
      <section className="rounded-[18px] border border-line bg-white px-4 lg:grid lg:grid-cols-2 lg:gap-3.5 lg:border-0 lg:bg-transparent lg:px-0">
        {list.map((f, i) => (
          <div key={f.title} className={`py-3 lg:rounded-[18px] lg:border lg:border-line lg:bg-white lg:p-[18px] ${i < list.length - 1 ? "border-b border-line" : ""}`}>
            <p className="text-[15px] font-bold lg:text-[13px] lg:font-extrabold lg:text-muted">{f.title}</p>
            <p className="whitespace-pre-line text-[13px] text-muted lg:mt-1.5 lg:text-[15px] lg:font-bold lg:leading-normal lg:text-ink">{f.body}</p>
          </div>
        ))}
      </section>
    );
  };
  const metaBits = [stats.rating !== null && `★ ${stats.rating.toFixed(1)}`, stats.orders > 0 && `${stats.orders} ${stats.orders === 1 ? "order" : "orders"}`, ward].filter(Boolean);
  const when = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

  const section = p.kind === "item" || p.kind === "stay" ? "products" : p.kind === "service" ? "services" : "online";
  const sectionName = { products: "Products", services: "Services", online: "Online" }[section];
  const sellerLine = [
    stats.rating !== null && `★ ${stats.rating.toFixed(1)} (${stats.reviews} ${stats.reviews === 1 ? "review" : "reviews"})`,
    stats.orders > 0 && `${stats.orders} ${p.kind === "service" ? (stats.orders === 1 ? "job" : "jobs") : stats.orders === 1 ? "order" : "orders"} done`,
    confirmed ? `Vouched by ${ward}` : ward,
  ].filter(Boolean);
  const aboutTitle = { item: "About this product", stay: "About this place", service: "About this service", digital: "About this download", session: "About this session", event: "About this event" }[p.kind];
  const shown = p.photos.slice(0, 3);
  const morePhotos = p.photos.length - shown.length;

  return (
    <BasketProvider initialQty={basket.qty} initialCount={basket.count} initialTotal={basket.totalKobo}>
      <main className="mx-auto min-h-dvh max-w-md pb-36 lg:max-w-[1280px] lg:px-6 lg:pb-16 lg:pt-5">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(listingJsonLd(p, shop, stats)) }} />
        <nav aria-label="Breadcrumb" className="mb-4 hidden text-[13px] font-bold text-muted lg:block">
          <Link href={`/home?s=${section}`} className="hover:text-ink">
            {sectionName}
          </Link>
          {" / "}
          <Link href={`/home?s=${section}${section === "online" ? "" : `&cat=${shop.category}`}`} className="hover:text-ink">
            {categoryLabel(shop.category)}
          </Link>
          {" / "}
          <Link href={`/s/${shop.slug}`} className="text-ink hover:underline">
            {shop.name}
          </Link>
        </nav>

        <div className="relative lg:hidden">
          <Gallery photos={p.photos} name={p.name} />
          <Link
            href={`/s/${shop.slug}`}
            aria-label="Back to shop"
            className="absolute left-3.5 top-3.5 flex size-11 items-center justify-center rounded-full bg-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <ShareButton title={p.name} text={`${p.name} from ${shop.name} on Vouchly`} path={`/p/${p.id}`} className="absolute right-3.5 top-3.5 flex size-11 items-center justify-center rounded-full bg-white" />
        </div>

        <div className="flex flex-col gap-[22px] px-4 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-7 lg:px-0 lg:pt-0">
          <div className="flex flex-col gap-[22px] lg:col-start-1 lg:row-start-1 lg:gap-7">
            {/* Computers: one big photo and two small ones. */}
            <div className={`hidden gap-2.5 lg:grid ${shown.length > 1 ? "grid-cols-[2fr_1fr]" : "grid-cols-1"} ${shown.length > 2 ? "grid-rows-[180px_180px]" : "grid-rows-[370px]"}`}>
              <div className={`shimmer relative overflow-hidden rounded-[20px] ${shown.length > 2 ? "row-span-2" : ""}`}>
                <TilePhoto src={shown[0]} name={p.name} sizes="(min-width: 1024px) 560px, 100vw" priority />
              </div>
              {shown.slice(1).map((src, i) => (
                <div key={src} className="shimmer relative overflow-hidden rounded-[20px]">
                  <TilePhoto src={src} name={p.name} sizes="280px" />
                  {i === shown.length - 2 && morePhotos > 0 && (
                    <span className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-extrabold text-white">
                      + {morePhotos} {morePhotos === 1 ? "photo" : "photos"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <section>
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-extrabold ${pill.warm ? "bg-[#FDEBD3] text-[#8A4307]" : "bg-soft text-deep"}`}>{pill.text}</span>
                <ShareButton title={p.name} text={`${p.name} from ${shop.name} on Vouchly`} path={`/p/${p.id}`} className="hidden size-11 items-center justify-center rounded-full border border-line bg-white lg:flex" />
              </div>
              <h1 className="mb-1.5 mt-2.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em] lg:text-[32px] lg:leading-[1.15]">{p.name}</h1>
              <p className="flex flex-wrap items-baseline gap-x-2 lg:hidden">
                <span className={`text-[26px] font-extrabold tabular-nums ${free ? "text-[#1D7A46]" : ""}`}>{price}</span>
                {unit && p.priceType !== "quote" && <span className="text-sm font-semibold text-muted">{p.kind === "item" ? `for ${unit}` : unit}</span>}
              </p>
              <p className="hidden flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sm font-semibold text-muted lg:flex">
                <Link href={`/s/${shop.slug}`} className="flex items-center gap-1.5 font-extrabold text-ink hover:underline">
                  {shop.name}
                  {confirmed && <Seal />}
                </Link>
                {sellerLine.map((b) => (
                  <span key={String(b)}>{b}</span>
                ))}
              </p>
              {p.about && (
                <>
                  <h2 className="mb-2.5 mt-7 hidden text-xl font-extrabold lg:block">{aboutTitle}</h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#3a4458] lg:mt-0 lg:max-w-[68ch] lg:text-base lg:leading-[1.65]">{p.about}</p>
                </>
              )}
              {p.kind === "service" && p.included.length > 0 && (
                <div className="mt-5">
                  <h2 className="mb-2 text-[15px] font-extrabold lg:text-xl">What&apos;s included</h2>
                  <ul className="flex flex-col gap-1.5 text-[15px] text-[#3a4458]">
                    {p.included.map((l) => (
                      <li key={l} className="flex gap-2">
                        <span aria-hidden="true" className="font-extrabold text-accent">✓</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <Link href={`/s/${shop.slug}`} className="-mt-1 flex items-center gap-3 rounded-[18px] border border-line bg-white p-3 lg:hidden">
              <span className="grid size-12 shrink-0 place-items-center rounded-[14px] font-extrabold text-white" style={{ background: toneFor(shop.name) }} aria-hidden="true">
                {initials(shop.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  <span className="truncate">{shop.name}</span>
                  {confirmed && <Seal />}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-muted">{metaBits.join(" · ")}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>

            {p.kind === "stay" && (
              <div className="-mt-3 grid grid-cols-3 gap-2 text-center lg:mt-0">
                {[
                  [p.guests, p.guests === 1 ? "guest" : "guests"],
                  [p.bedrooms, p.bedrooms === 1 ? "bedroom" : "bedrooms"],
                  [p.bathrooms, p.bathrooms === 1 ? "bathroom" : "bathrooms"],
                ].map(([n, l]) => (
                  <div key={String(l)} className="rounded-[18px] border border-line bg-white py-3">
                    <p className="text-lg font-extrabold">{n ?? "–"}</p>
                    <p className="text-xs font-semibold text-muted">{l}</p>
                  </div>
                ))}
              </div>
            )}
            {p.kind === "stay" && p.amenities.length > 0 && (
              <div className="-mt-3 flex flex-wrap gap-1.5 lg:mt-0">
                {p.amenities.map((a) => (
                  <span key={a} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {p.kind === "stay" &&
              infoCard([
                { title: "Where", body: `${shop.area}, Lagos. The exact address is shared once your booking is accepted.` },
                { title: "Check-in and check-out", body: `Check in from ${timeLabel(p.checkInTime) || "2pm"} · check out by ${timeLabel(p.checkOutTime) || "12pm"}` },
                p.minNights > 1 && { title: "Shortest stay", body: `${p.minNights} nights` },
                p.rules && { title: "House rules", body: p.rules },
              ])}
            {p.kind === "service" &&
              infoCard([
                { title: "Works in", body: p.serviceAreas.length ? p.serviceAreas.join(", ") : "All of Lagos" },
                { title: "Working days", body: dayList(p.workDays) },
              ])}
            {(p.kind === "session" || p.kind === "event") &&
              infoCard([
                p.kind === "event" && { title: "When", body: `${eventWhen(p.eventAt)}${p.durationMins ? `, for ${durationLabel(p.durationMins)}` : ""}` },
                p.kind === "session" && { title: "Length", body: durationLabel(p.durationMins) },
                { title: "Where", body: p.online ? "Online. You get the link after booking." : `In person in ${shop.area}, Lagos. You get the address after booking.` },
              ])}
          </div>

          {/* The booking or buy box. Sticky on computers. */}
          <aside aria-label={p.kind === "item" ? "Buy this" : "Book this"} className="flex flex-col gap-[22px] lg:sticky lg:top-[136px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:gap-[18px] lg:rounded-[22px] lg:border lg:border-line lg:bg-white lg:p-[22px] lg:shadow-[0_16px_40px_-24px_rgba(20,33,61,0.35)]">
            <div className="hidden lg:block">
              {unit && p.priceType !== "quote" && <p className="text-[13px] font-bold text-muted">{p.kind === "item" ? `For ${unit}` : unit.charAt(0).toUpperCase() + unit.slice(1)}</p>}
              <p className={`mt-0.5 text-[30px] font-extrabold tracking-[-0.02em] tabular-nums ${free ? "text-[#1D7A46]" : ""} ${p.priceType === "quote" && p.kind === "service" ? "text-2xl" : ""}`}>{price}</p>
            </div>
            {p.kind === "stay" && (
              <StayBooking productId={p.id} priceKobo={p.priceKobo} minNights={p.minNights} maxGuests={p.guests} taken={taken} today={today} disabled={blocked} guest={!me} />
            )}
            {p.kind === "service" && (
              <ServiceBooking
                productId={p.id}
                quote={p.priceType === "quote"}
                priceKobo={p.priceKobo}
                priceUnit={p.priceUnit}
                days={serviceDays}
                areas={p.serviceAreas.length ? p.serviceAreas : [...AREAS]}
                defaultArea={me?.area ?? shop.area}
                disabled={blocked}
                guest={!me}
              />
            )}
            {p.kind === "session" && <SessionBooking productId={p.id} priceKobo={p.priceKobo} slots={slots} guest={!me} disabled={blocked} />}
            {p.kind === "event" && soldOut && !blocked && waitBox}
            {p.kind === "event" && !(soldOut && !blocked) && <EventTickets productId={p.id} priceKobo={p.priceKobo} left={left} guest={!me} disabled={blocked} />}
            {p.kind === "digital" && (
              <DigitalBuy productId={p.id} priceKobo={p.priceKobo} fileText={fileLabel(p.fileName, p.fileSize)} guest={!me} disabled={blocked} />
            )}
            {p.kind === "item" && (
              <div className="hidden gap-2.5 lg:flex">
                {canBuy && soldOut ? (
                  waitBox
                ) : canBuy ? (
                  <ItemBar productId={p.id} name={p.name} priceKobo={p.priceKobo} max={itemLeft ?? 99} />
                ) : (
                  <p className="w-full rounded-[14px] bg-chip px-4 py-3.5 text-center text-[13px] font-semibold">{mine ? "This is your product." : "Not available to order right now."}</p>
                )}
              </div>
            )}
            {mine && p.kind === "stay" && (
              <Link href={`/shop/manage/products/${p.id}/calendar`} className="text-center text-sm font-bold text-accent">
                Block dates on your calendar →
              </Link>
            )}
            <Protection hold={holdMode()} ward={ward} />
          </aside>

          <div className="flex flex-col gap-[22px] lg:col-start-1 lg:row-start-2 lg:gap-8">
            {p.kind === "item" && ways.length > 0 && (
              <section>
                <h2 className="mb-2.5 text-[17px] font-extrabold lg:text-xl">How you can get it</h2>
                {d && <p className="-mt-1.5 mb-2.5 text-[13px] font-semibold text-muted">Delivers {dayList(d.deliveryDays)} · order by {cutoffLabel(d.orderCutoff)}</p>}
                <div className="rounded-[18px] border border-line bg-white">
                  {ways.map((w, i) => (
                    <div key={w.title} className={`flex justify-between gap-3 px-4 py-3.5 ${i < ways.length - 1 ? "border-b border-line" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold">{w.title}</p>
                        {w.body && <p className="mt-0.5 text-[13px] text-muted">{w.body}</p>}
                      </div>
                      {w.free ? (
                        <span className="text-sm font-extrabold text-[#1D7A46]">Free</span>
                      ) : (
                        w.side && <span className="whitespace-nowrap text-sm font-bold tabular-nums text-muted">{w.side}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {latest && (
              <section>
                <div className="mb-2.5 flex items-baseline justify-between lg:mb-3">
                  <h2 className="text-[17px] font-extrabold lg:text-xl">
                    Reviews <span className="font-bold text-muted">★ {stats.rating?.toFixed(1)} ({stats.reviews})</span>
                  </h2>
                  <Link href={`/s/${shop.slug}#reviews`} className="text-sm font-bold text-accent">
                    See all
                  </Link>
                </div>
                <div className="grid gap-3.5 lg:grid-cols-2">
                  {latestReviews.map((r, i) => (
                    <div key={r.review.id} className={`rounded-[18px] border border-line bg-white px-4 py-3.5 lg:p-[18px] ${i > 0 ? "hidden lg:block" : ""}`}>
                      <p className="flex justify-between gap-2 text-sm font-bold">
                        <span>
                          {r.name.split(" ")[0]} · {r.ward}
                        </span>
                        <span className="text-xs font-semibold text-muted">{when.format(r.review.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-[13px] tracking-[2px] text-[#C2410C]" aria-label={`${r.review.stars} stars`}>
                        {"★".repeat(r.review.stars)}
                        <span className="text-[#c8ceda]">{"★".repeat(5 - r.review.stars)}</span>
                      </p>
                      {r.review.text && <p className="mt-1.5 text-sm leading-relaxed text-[#3a4458]">{r.review.text}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {p.kind === "item" && (
          <div className="lg:hidden">
            <ActionBar>
              {canBuy && soldOut ? (
                waitBox
              ) : canBuy ? (
                <ItemBar productId={p.id} name={p.name} priceKobo={p.priceKobo} max={itemLeft ?? 99} />
              ) : (
                <p className="w-full rounded-[14px] bg-chip px-4 py-3.5 text-center text-[13px] font-semibold">{mine ? "This is your product." : "Not available to order right now."}</p>
              )}
            </ActionBar>
          </div>
        )}
      </main>
    </BasketProvider>
  );
}
