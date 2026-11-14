import Link from "next/link";
import { categoryLabel, dayList } from "@/lib/catalog";
import type { ShopCard } from "@/lib/browse";
import Seal from "@/components/seal";
import { initials, toneFor } from "@/lib/initials";

const deliveryText = (s: ShopCard) => (s.kinds.includes("item") && s.deliveryDays.length ? `Delivers ${dayList(s.deliveryDays, true)}` : "");

// A shop in a list: initials, name and seal, ward, rating.
export function ShopRow({ s }: { s: ShopCard }) {
  return (
    <Link href={`/s/${s.slug}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: toneFor(s.name) }} aria-hidden="true">
        {initials(s.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15px] font-bold">
          <span className="truncate">{s.name}</span>
          {s.confirmed && <Seal />}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-semibold text-muted">{[s.ward, deliveryText(s) || categoryLabel(s.category)].join(" · ")}</span>
      </span>
      {s.rating !== null && s.reviewCount > 0 && (
        <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
          ★ {s.rating.toFixed(1)}
          <span className="sr-only"> stars from {s.reviewCount} reviews</span>
        </span>
      )}
    </Link>
  );
}
