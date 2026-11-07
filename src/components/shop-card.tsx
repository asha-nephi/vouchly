import Link from "next/link";
import { categoryLabel, dayList, naira } from "@/lib/catalog";
import type { ShopCard } from "@/lib/browse";
import Photo from "@/components/photo";

const deliveryText = (s: ShopCard) => (s.kinds.includes("item") && s.deliveryDays.length ? `Delivers ${dayList(s.deliveryDays, true)}` : "");

// "from ₦3,000", "from ₦45,000 a night", "Price after a chat"
function fromText(s: ShopCard) {
  if (s.fromKobo === null) return "Price after a chat";
  return `from ${naira(s.fromKobo)}${s.kinds.length === 1 && s.kinds[0] === "stay" ? " a night" : ""}`;
}

// "★ 4.8 (12)" once a shop has reviews.
export function Stars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating || !count) return null;
  return (
    <span className="shrink-0 whitespace-nowrap text-xs font-bold text-[#1d2433]">
      <span className="text-[#e9a23b]" aria-hidden="true">★</span> {rating.toFixed(1)} <span className="font-semibold text-muted">({count})</span>
      <span className="sr-only"> stars from {count} reviews</span>
    </span>
  );
}

// Big photo card for sideways scrolling rows.
export function ShopTile({ s }: { s: ShopCard }) {
  return (
    <Link href={`/s/${s.slug}`} className="flex w-[220px] shrink-0 snap-start flex-col gap-2.5">
      <div className="relative h-[140px] w-full overflow-hidden rounded-[18px] bg-soft">
{s.photo && <Photo src={s.photo} sizes="220px" />}
      </div>
      <div className="px-0.5">
        <p className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold">{s.name}</span>
          <Stars rating={s.rating} count={s.reviewCount} />
        </p>
        <p className="truncate text-[13px] text-muted">
          {categoryLabel(s.category)} · {fromText(s)}
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
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-soft">
{s.photo && <Photo src={s.photo} sizes="72px" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold">{s.name}</span>
          <Stars rating={s.rating} count={s.reviewCount} />
        </p>
        <p className="truncate text-[13px] text-muted">
          {s.productCount} {s.kinds.every((k) => k === "item") ? (s.productCount === 1 ? "item" : "items") : s.productCount === 1 ? "listing" : "listings"} · {fromText(s)}
        </p>
        <p className="truncate text-xs text-muted">{[s.area, deliveryText(s)].filter(Boolean).join(" · ")}</p>
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
