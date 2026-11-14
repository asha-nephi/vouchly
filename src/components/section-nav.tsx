"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SECTIONS = [
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "online", label: "Online" },
] as const;

// Browse pages are the only ones where a section is "current".
const browsing = (path: string) => path === "/home" || path === "/search" || path.startsWith("/c/");

function useSection() {
  const path = usePathname();
  const params = useSearchParams();
  const s = params.get("s");
  const current = browsing(path) ? (SECTIONS.some((x) => x.id === s) ? s : "products") : null;
  return { path, params, current };
}

// Search box in the computer top bar. Searches inside the current section.
export function TopSearch() {
  const { path, params, current } = useSection();
  return (
    <form action="/search" role="search" className="flex h-[46px] max-w-[560px] flex-[1_1_360px] items-center gap-2.5 rounded-xl bg-[#F2F4F8] px-3.5 focus-within:ring-2 focus-within:ring-accent/30">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Search Vouchly</span>
        <input
          key={path + (params.get("q") ?? "")}
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={path === "/search" ? params.get("q") ?? "" : ""}
          placeholder={current === "services" ? "Search plumbers, electricians, cleaners…" : current === "online" ? "Search coaching, classes, downloads…" : "Search tigernut, small chops, fabric…"}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a93a5]"
        />
      </label>
      {current && <input type="hidden" name="s" value={current} />}
    </form>
  );
}

// Products / Services / Online, as tabs under the computer top bar.
export function SectionTabs() {
  const { path, params, current } = useSection();
  const q = path === "/search" ? params.get("q") : null;
  return (
    <nav aria-label="Sections" className="mx-auto flex max-w-[1280px] gap-7 px-6 text-[15px] font-bold">
      {SECTIONS.map((s) => {
        const on = current === s.id;
        const href = q ? `/search?s=${s.id}&q=${encodeURIComponent(q)}` : `/home?s=${s.id}`;
        return (
          <Link key={s.id} href={href} aria-current={on ? "page" : undefined} className={`border-b-[3px] py-3 ${on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Hides the top bar where the seller area has its own sidebar.
export function HideOn({ prefixes, children }: { prefixes: string[]; children: React.ReactNode }) {
  const path = usePathname();
  return prefixes.some((p) => path.startsWith(p)) ? null : children;
}

// Area picker in the computer top bar for people who aren't signed in.
// Keeps the current search and section; other pages go to Home.
export function AreaMenu({ areas }: { areas: readonly string[] }) {
  const { path, params } = useSection();
  const picked = params.get("area");
  const area = picked && areas.includes(picked) ? picked : "Ikeja";
  const base = path === "/search" ? "/search" : "/home";
  const href = (a: string) => {
    const p = new URLSearchParams(path === "/home" || path === "/search" ? params.toString() : "");
    p.set("area", a);
    return `${base}?${p}`;
  };
  return (
    <details className="relative" key={path + params.toString()}>
      <summary className="flex h-[46px] cursor-pointer list-none items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-sm font-bold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {area}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="sr-only">, change area</span>
      </summary>
      <div className="absolute left-0 top-[52px] z-40 grid max-h-[60vh] w-56 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(20,33,61,0.3)]">
        {areas.map((a) => (
          <Link key={a} href={href(a)} className={`flex min-h-10 items-center rounded-xl px-3 text-sm hover:bg-bg ${a === area ? "bg-soft font-extrabold" : "font-semibold"}`}>
            {a}
          </Link>
        ))}
      </div>
    </details>
  );
}
