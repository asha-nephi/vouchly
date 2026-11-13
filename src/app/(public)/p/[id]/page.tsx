import type { Metadata } from "next";
import { clip, shareMeta } from "@/lib/share-meta";
import { priceText } from "@/lib/listings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { AREAS, cutoffLabel, dayList, naira } from "@/lib/catalog";
import { takenNights } from "@/lib/bookings";
import { addDays, todayKey, weekday } from "@/lib/dates";
import { timeLabel } from "@/lib/listings";
import { holdMode } from "@/lib/orders";
import ServiceBooking from "./service-booking";
import StayBooking from "./stay-booking";
import DigitalBuy from "./digital-buy";
import { fileLabel } from "@/lib/file-types";
import { BasketBar, BasketProvider, Stepper } from "@/components/basket-controls";
import TabBar from "@/components/tab-bar";
import Photo from "@/components/photo";
import ShareButton from "@/components/share-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return { title: "Not found" };
  const [row] = await db.select({ p: products, shop: shops }).from(products).innerJoin(shops, eq(shops.id, products.shopId)).where(eq(products.id, id)).limit(1);
  if (!row || row.p.removed) return { title: "Not found" };
  const { p, shop } = row;
  return shareMeta({
    title: `${p.name} · ${priceText(p)}`,
    description: clip(p.about) || `From ${shop.name} in ${shop.area}, Lagos. Pay safely on Vouchly.`,
    path: `/p/${p.id}`,
    photo: p.photos[0],
  });
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ product: products, shop: shops })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, id), eq(products.removed, false)))
    .limit(1);
  if (!row || (!row.product.isActive && row.shop.ownerId !== me?.id)) notFound();
  const { product: p, shop } = row;
  const [[d], basket] = await Promise.all([
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    basketStart(),
  ]);
  const canBuy = shop.isOpen && p.isActive && shop.ownerId !== me?.id;
  const mine = shop.ownerId === me?.id;
  const blocked = mine
    ? "This is your listing."
    : !shop.isOpen || !p.isActive
      ? "Not available to book right now."
      : !holdMode() && !shop.paystackSubaccount && !(p.kind === "digital" && p.priceKobo === 0)
        ? `${shop.name} hasn't set up payments yet.`
        : undefined;
  const today = todayKey();
  const taken = p.kind === "stay" ? [...(await takenNights(p))].filter((k) => k >= today) : [];
  const serviceDays: string[] = [];
  if (p.kind === "service") {
    for (let k = addDays(today, 1); serviceDays.length < 14 && k <= addDays(today, 60); k = addDays(k, 1)) if (p.workDays.includes(weekday(k))) serviceDays.push(k);
  }
  const unit = p.kind === "stay" ? "a night" : p.kind === "service" ? (p.priceUnit ?? "") : (p.size ?? "");
  const price = p.kind === "service" && p.priceType === "quote" ? "Price after a quick chat" : p.kind === "digital" && p.priceKobo === 0 ? "Free" : naira(p.priceKobo);

  const facts = [
    d && { title: "Delivery", body: `${dayList(d.deliveryDays)} · order by ${cutoffLabel(d.orderCutoff)}` },
    d?.pickupOn && { title: "Pickup", body: [d.pickupSpot, d.pickupHours].filter(Boolean).join(" · ") || "Free pickup" },
    d?.dropOffOn && { title: "Seller drops it off", body: d.dropOffAreas.join(", ") },
    d?.riderOn && {
      title: "Rider",
      body: d.riderPayer === "buyer_on_arrival" ? `About ${d.riderEstimate ?? "₦2,000 – ₦3,500"}, paid to the rider` : "Rider fee added at checkout",
    },
  ].filter(Boolean) as { title: string; body: string }[];

  return (
    <BasketProvider initialQty={basket.qty} initialCount={basket.count} initialTotal={basket.totalKobo}>
      <main className="mx-auto min-h-dvh max-w-md pb-44">
        <div className="relative">
          <div className="flex h-[300px] snap-x snap-mandatory overflow-x-auto bg-chip [scrollbar-width:none] md:h-[420px]">
            {p.photos.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0 snap-center">
                <Photo src={src} alt={i === 0 ? p.name : ""} sizes="(min-width: 1200px) 52rem, (min-width: 768px) 44rem, 100vw" priority={i === 0} />
              </div>
            ))}
          </div>
          <Link
            href={`/s/${shop.slug}`}
            aria-label="Back to shop"
            className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <ShareButton title={p.name} text={`${p.name} from ${shop.name} on Vouchly`} path={`/p/${p.id}`} className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]" />
          {p.photos.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
              {p.photos.length} photos · swipe
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 pt-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{p.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="text-xl font-extrabold">{price}</span>
              {unit && p.priceType !== "quote" && <span className="text-sm text-muted">{unit}</span>}
              {p.kind === "item" && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.sellMode === "preorder" ? "bg-[#fdf0d5] text-[#7a4d06]" : "bg-[#ddf3e4] text-[#1b6b3a]"}`}>
                  {p.sellMode === "preorder" ? "Pre-order" : "In stock"}
                </span>
              )}
            </div>
          </div>

          <Link href={`/s/${shop.slug}`} className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-soft">
{shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="40px" />}
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">{shop.name}</span>
              <span className="block text-xs font-bold text-accent">Verified member · {shop.area}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>

          {p.kind === "stay" && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [p.guests, p.guests === 1 ? "guest" : "guests"],
                [p.bedrooms, p.bedrooms === 1 ? "bedroom" : "bedrooms"],
                [p.bathrooms, p.bathrooms === 1 ? "bathroom" : "bathrooms"],
              ].map(([n, l]) => (
                <div key={String(l)} className="rounded-[16px] bg-white py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
                  <p className="text-lg font-extrabold">{n ?? "–"}</p>
                  <p className="text-xs text-muted">{l}</p>
                </div>
              ))}
            </div>
          )}
          {p.about && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3a4458]">{p.about}</p>}
          {p.kind === "stay" && p.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.amenities.map((a) => (
                <span key={a} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
                  {a}
                </span>
              ))}
            </div>
          )}
          {(p.kind === "stay" || p.kind === "service") && (
            <section className="rounded-[18px] bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              {(p.kind === "stay"
                ? [
                    { title: "Where", body: `${shop.area}, Lagos. The exact address is shared once your booking is accepted.` },
                    { title: "Check-in and check-out", body: `Check in from ${timeLabel(p.checkInTime) || "2pm"} · check out by ${timeLabel(p.checkOutTime) || "12pm"}` },
                    p.minNights > 1 && { title: "Shortest stay", body: `${p.minNights} nights` },
                    p.rules && { title: "House rules", body: p.rules },
                  ]
                : [
                    { title: "Areas covered", body: p.serviceAreas.length ? p.serviceAreas.join(", ") : "All of Lagos" },
                    { title: "Working days", body: dayList(p.workDays) },
                  ]
              )
                .filter((f): f is { title: string; body: string } => !!f)
                .map((f, i, all) => (
                  <div key={f.title} className={`py-3 ${i < all.length - 1 ? "border-b border-[#eef0f4]" : ""}`}>
                    <p className="text-sm font-bold">{f.title}</p>
                    <p className="whitespace-pre-line text-[13px] text-muted">{f.body}</p>
                  </div>
                ))}
            </section>
          )}
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
          {p.kind === "digital" && (
            <DigitalBuy productId={p.id} priceKobo={p.priceKobo} fileText={fileLabel(p.fileName, p.fileSize)} guest={!me} disabled={blocked} />
          )}
          {mine && p.kind === "stay" && (
            <Link href={`/shop/manage/products/${p.id}/calendar`} className="text-center text-sm font-bold text-accent">
              Block dates on your calendar →
            </Link>
          )}

          {p.kind === "item" && facts.length > 0 && (
            <section className="rounded-[18px] bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              {facts.map((f, i) => (
                <div key={f.title} className={`py-3 ${i < facts.length - 1 ? "border-b border-[#eef0f4]" : ""}`}>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-[13px] text-muted">{f.body}</p>
                </div>
              ))}
            </section>
          )}

          {p.kind === "item" && !canBuy && (
            <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">
              {mine ? "This is your product." : "Not available to order right now."}
            </p>
          )}
          {p.kind === "item" && canBuy && (
            <div className="flex items-center justify-between rounded-[18px] bg-white p-3 pl-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <span className="text-[15px] font-bold">In your basket</span>
              <Stepper productId={p.id} name={p.name} />
            </div>
          )}
        </div>
        <BasketBar />
        <TabBar active="Home" />
      </main>
    </BasketProvider>
  );
}
