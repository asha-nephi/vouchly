import Link from "next/link";
import { categoryLabel, dayList, naira } from "@/lib/catalog";
import type { ShopCard } from "@/lib/browse";

const deliveryText = (days: number[]) => (days.length ? `Delivers ${dayList(days, true)}` : "");

// "★ 4.8 (12)" once a shop has reviews.
export function Stars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating || !count) return null;
  return (
    <span className="text-xs font-bold text-[#1d2433]">
      <span className="text-[#e9a23b]" aria-hidden="true">★</span> {rating.toFixed(1)} <span className="font-semibold text-muted">({count})</span>
      <span className="sr-only"> stars from {count} reviews</span>
    </span>
  );
}

// Big photo card for sideways scrolling rows.
export function ShopTile({ s }: { s: ShopCard }) {
  return (
    <Link href={`/s/${s.slug}`} className="flex w-[220px] shrink-0 snap-start flex-col gap-2.5">
      <div className="h-[140px] w-full overflow-hidden rounded-[18px] bg-soft">
        {s.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <div className="px-0.5">
        <p className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold">{s.name}</span>
          <Stars rating={s.rating} count={s.reviewCount} />
        </p>
        <p className="truncate text-[13px] text-muted">
          {categoryLabel(s.category)} · from {naira(s.fromKobo)}
        </p>
        <p className="truncate text-xs font-bold text-accent">Verified member · {s.ward}</p>
      </div>
    </Link>
  );
}

// Compact row for lists.
export function ShopRow({ s }: { s: ShopCard }) {
  return (
    <Link href={`/s/${s.slug}`} className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <div className="size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-soft">
        {s.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold">{s.name}</span>
          <Stars rating={s.rating} count={s.reviewCount} />
        </p>
        <p className="truncate text-[13px] text-muted">
          {s.productCount} {s.productCount === 1 ? "item" : "items"} · from {naira(s.fromKobo)}
        </p>
        <p className="truncate text-xs text-muted">{[s.area, deliveryText(s.deliveryDays)].filter(Boolean).join(" · ")}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-accent">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" />
          </svg>
          Verified member · {s.ward}
        </p>
      </div>
    </Link>
  );
}
