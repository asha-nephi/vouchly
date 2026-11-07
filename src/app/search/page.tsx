import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { browse, searchShops } from "@/lib/browse";
import { CATEGORIES } from "@/lib/catalog";
import { ShopRow } from "@/components/shop-card";
import TabBar from "@/components/tab-bar";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const user = await requireUser();
  const area = user.area ?? "Ikeja";
  const { q = "", cat } = await searchParams;
  const category = CATEGORIES.some((c) => c.id === cat) ? cat : undefined;
  const query = q.trim().slice(0, 60);

  const results = query
    ? await searchShops(area, query, category)
    : await browse(area, category).then((r) => [...r.near, ...r.more]);

  const chip = (id: string | undefined, label: string) => {
    const on = id === category;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (id) params.set("cat", id);
    return (
      <Link
        key={label}
        href={`/search?${params}`}
        className={`flex h-[38px] shrink-0 items-center rounded-full px-3.5 text-[13px] ${on ? "bg-ink font-bold text-white" : "border border-[#d5dae4] bg-white font-semibold"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex flex-col gap-4 px-4 pt-4">
        <form action="/search" className="flex h-[52px] items-center gap-2.5 rounded-2xl border-2 border-ink bg-white px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="2" aria-hidden="true">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
          </svg>
          <label className="flex-1">
            <span className="sr-only">Search</span>
            <input
              name="q"
              type="search"
              defaultValue={query}
              autoFocus={!query}
              placeholder="Tigernut, plumber, shortlet…"
              className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-[#8a93a5]"
            />
          </label>
          {category && <input type="hidden" name="cat" value={category} />}
        </form>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {chip(undefined, "All")}
          {CATEGORIES.map((c) => chip(c.id, c.label))}
        </div>

        <p className="text-[13px] font-semibold text-muted">
          {results.length} {results.length === 1 ? "shop" : "shops"}
          {query ? ` for “${query}”` : ""} · {area} first
        </p>

        {results.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center">
            <p className="text-[15px] font-bold">Nothing found</p>
            <p className="mt-1 text-[13px] text-muted">Try a shorter word, or a different category.</p>
          </div>
        ) : (
          results.map((s) => <ShopRow key={s.id} s={s} />)
        )}
      </div>
      <TabBar active="Search" />
    </main>
  );
}
