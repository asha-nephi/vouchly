import Link from "next/link";
import { naira } from "@/lib/catalog";
import { initials, toneFor } from "@/lib/initials";
import { ctaLabel, priceText, tileTag } from "@/lib/listings";
import { nextDeliveryDay } from "@/lib/orders";
import type { ProCard as Pro, SectionRow } from "@/lib/sections";
import Seal from "@/components/seal";
import TilePhoto from "@/components/tile-photo";

const day = (d: Date) => new Intl.DateTimeFormat("en-NG", { weekday: "short", timeZone: "Africa/Lagos" }).format(d);

// A photo tile for products and online listings.
export function ListingTile({ row, priority, seatsLeft }: { row: SectionRow; priority?: boolean; seatsLeft?: number | null }) {
  const p = row.product;
  const next = p.kind === "item" && row.deliveryDays ? nextDeliveryDay(row.deliveryDays, row.cutoff ?? "thu 18:00", new Date(), p.sellMode === "in_stock") : null;
  const tag = tileTag(p, next ? day(next) : undefined);
  const online = p.kind === "digital" || p.kind === "session" || p.kind === "event";
  const place = online && p.kind !== "digital" ? (p.online ? "Online" : `In person · ${row.shopArea}`) : null;
  const seats = p.kind === "event" && seatsLeft !== undefined && seatsLeft !== null ? (seatsLeft <= 0 ? "Sold out" : seatsLeft === 1 ? "1 seat left" : `${seatsLeft} seats left`) : null;
  const free = p.priceKobo === 0 && (p.kind === "digital" || p.kind === "event");
  return (
    <Link href={`/p/${p.id}`} className="block min-w-0">
      <span className="shimmer relative block aspect-square overflow-hidden rounded-[18px]">
        <TilePhoto src={p.photos[0]} name={p.name} sizes="(min-width: 1024px) 240px, (min-width: 768px) 22rem, 50vw" priority={priority} />
        {tag && <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-ink">{tag}</span>}
      </span>
      <span className="mb-0.5 mt-2.5 block text-[15px] font-bold leading-tight">{p.name}</span>
      <span className={`mb-1 block text-[15px] font-extrabold tabular-nums ${free ? "text-[#1D7A46]" : ""}`}>{priceText(p).replace("Price after a chat", "Ask for a price")}</span>
      {(place || seats) && <span className="mb-0.5 block truncate text-xs font-semibold text-muted">{[place, seats].filter(Boolean).join(" · ")}</span>}
      <span className="flex items-center gap-1 text-xs font-semibold text-muted">
        {row.confirmed && <Seal size={14} />}
        <span className="truncate">{row.shopName}</span>
      </span>
    </Link>
  );
}

// A service pro: who they are, when they're free, rating and price.
export function ProCard({ c }: { c: Pro }) {
  const p = c.product;
  const quote = p.priceType === "quote";
  return (
    <article className="flex flex-col rounded-[20px] border border-line bg-white p-[18px]">
      <div className="flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: toneFor(c.shopName) }} aria-hidden="true">
          {initials(c.shopName)}
        </span>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-base font-extrabold">
            <Link href={`/s/${c.shopSlug}`} className="truncate hover:underline">
              {c.shopName}
            </Link>
            {c.confirmed && <Seal size={16} />}
          </h3>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-muted">
            {p.name} · {c.ward}
          </p>
        </div>
      </div>
      {p.about && <p className="mt-3.5 line-clamp-2 text-sm leading-normal text-[#3A4458]">{p.about}</p>}
      {(c.free || (c.rating !== null && c.reviewCount > 0)) && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {c.free && <span className="rounded-full bg-[#E3F3EA] px-2.5 py-1 text-xs font-extrabold text-[#1D7A46]">{c.free.label}</span>}
          {c.rating !== null && c.reviewCount > 0 && (
            <span className="rounded-full bg-[#F2F4F8] px-2.5 py-1 text-xs font-bold">
              ★ {c.rating.toFixed(1)} ({c.reviewCount})
            </span>
          )}
        </div>
      )}
      <span className="min-h-4 flex-1" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2.5 border-t border-line pt-3.5">
        <p className="text-[13px] font-semibold text-muted">
          {quote ? "Price after a chat" : p.priceUnit ? p.priceUnit.charAt(0).toUpperCase() + p.priceUnit.slice(1) : "Price"}
          <span className="block text-[17px] font-extrabold text-ink tabular-nums">{quote ? "Ask for a price" : p.priceKobo === 0 ? "Free" : naira(p.priceKobo)}</span>
        </p>
        <Link href={`/p/${p.id}`} className="flex h-11 shrink-0 items-center rounded-xl bg-ink px-[18px] text-sm font-extrabold text-white">
          {ctaLabel(p)}
          <span className="sr-only"> {c.shopName}</span>
        </Link>
      </div>
    </article>
  );
}
