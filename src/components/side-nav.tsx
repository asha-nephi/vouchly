"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SideItem = { href: string; label: string; count?: number };

// A menu link in the navy computer sidebar. The current page is highlighted.
export function SideLinks({ items }: { items: SideItem[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const here = (href: string) => {
    const [p, q] = href.split("?");
    if (p !== path || href.includes("#")) return false;
    // Links that differ only by ?show= are told apart by it.
    const want = new URLSearchParams(q ?? "").get("show");
    return (params.get("show") ?? null) === want;
  };
  return (
    <nav aria-label="Seller menu" className="flex flex-col gap-1">
      {items.map((n) => {
        const on = here(n.href);
        return (
          <Link
            key={n.href + n.label}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-[42px] items-center justify-between rounded-[10px] px-3 text-sm ${on ? "bg-white/12 font-extrabold text-white" : "font-semibold text-[#C9D3EE] hover:bg-white/6 hover:text-white"}`}
          >
            {n.label}
            {!!n.count && (
              <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#E5484D] px-[7px] text-xs font-extrabold text-white">
                {n.count}
                <span className="sr-only"> waiting</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
