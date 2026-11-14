import Link from "next/link";
import { browse } from "@/lib/browse";
import { categoryLabel, naira } from "@/lib/catalog";
import { categoryCounts, proCards, sectionListings, tradeCounts, SECTIONS, SECTION_IDS, type Filters, type Section } from "@/lib/sections";
import { ticketsTaken } from "@/lib/sessions";
import { ShopRow } from "@/components/shop-card";
import { FilterSheet, FilterSidebar } from "@/components/filter-panel";
import { ListingTile, ProCard } from "@/components/listing-cards";
import AutoSubmit from "@/components/auto-submit";

// Products / Services / Online as a segmented control. Phones only; computers use the top bar tabs.
export function SectionSwitch({ section, action, q, area }: { section: Section; action: string; q?: string; area?: string }) {
  return (
    <nav aria-label="Sections" className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#EEF0F4] p-1 lg:hidden">
      {SECTION_IDS.map((s) => {
        const on = s === section;
        const params = new URLSearchParams({ s, ...(q ? { q } : {}), ...(area ? { area } : {}) });
        return (
          <Link key={s} href={`${action}?${params}`} aria-current={on ? "page" : undefined} className={`flex h-10 items-center justify-center rounded-[10px] text-sm ${on ? "bg-white font-extrabold shadow-[0_1px_2px_rgba(20,33,61,0.12)]" : "font-bold text-muted"}`}>
            {SECTIONS[s].label}
          </Link>
        );
      })}
    </nav>
  );
}

// Sort choice above the results. Keeps every other filter.
function Sort({ action, section, f }: { action: string; section: Section; f: Filters }) {
  const keep: [string, string][] = [["s", section]];
  if (f.q) keep.push(["q", f.q]);
  if (f.area) keep.push(["area", f.area]);
  for (const k of ["cat", "trade", "when", "r4", "how", "pr", "type", "where", "date", "max"] as const) {
    const v = f[k];
    if (v) keep.push([k, v === true ? "1" : String(v)]);
  }
  for (const p of f.price ?? []) keep.push(["price", p]);
  const opts = section === "services" ? [["soon", "Soonest available"], ["rating", "Top rated"], ["price", "Lowest price"]] : [["", "Newest"], ["rating", "Top rated"], ["price", "Lowest price"]];
  return (
    <AutoSubmit action={action} className="hidden items-center gap-2 text-sm font-bold text-muted lg:flex">
      {keep.map(([k, v], i) => (
        <input key={i} type="hidden" name={k} value={v} />
      ))}
      <label className="flex items-center gap-2">
        Sort
        <select name="sort" defaultValue={f.sort ?? opts[0][0]} className="h-10 rounded-[10px] border border-[#D5DAE3] bg-white px-2.5 font-bold text-ink">
          {opts.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
    </AutoSubmit>
  );
}

export default async function BrowseView({ section, area, f, action, showShops }: { section: Section; area: string; f: Filters; action: string; showShops?: boolean }) {
  const [counts, trades, pros, rows, shops] = await Promise.all([
    section === "online" ? Promise.resolve([]) : categoryCounts(section),
    section === "services" ? tradeCounts() : Promise.resolve([]),
    section === "services" ? proCards(area, f) : Promise.resolve([]),
    section === "services" ? Promise.resolve([]) : sectionListings(section, area, f),
    showShops && section === "products" && !f.q ? browse(area) : Promise.resolve(null),
  ]);
  const seats = await Promise.all(rows.map((r) => (r.product.kind === "event" && r.product.seats ? ticketsTaken(r.product.id).then((n) => r.product.seats! - n) : null)));
  const n = section === "services" ? pros.length : rows.length;
  const what = f.trade ? f.trade : f.cat ? categoryLabel(f.cat) : section === "services" ? "Pros" : section === "online" ? "Online and classes" : "Products";
  const title = f.q ? `Results for “${f.q}”` : section === "online" ? what : `${what} near ${area}`;
  const unit = section === "services" ? (n === 1 ? "vouched pro" : "vouched pros") : n === 1 ? "listing" : "listings";
  const sortNote = section === "services" && (!f.sort || f.sort === "soon") ? " · sorted by soonest available" : "";
  // Smart search says what it understood, with a way to change it.
  const showing = f.ai
    ? [
        f.trade ?? (f.cat ? categoryLabel(f.cat) : f.q ? `“${f.q}”` : SECTIONS[section].label),
        area,
        f.when === "tomorrow" ? "free tomorrow" : f.when === "week" ? "free this week" : f.date === "week" ? "this week" : null,
        f.max ? `up to ${naira(f.max * 100)}` : null,
      ].filter(Boolean)
    : null;
  const change = (() => {
    const p = new URLSearchParams();
    p.set("s", section);
    if (f.q) p.set("q", f.q);
    if (f.area) p.set("area", f.area);
    for (const k of ["cat", "trade", "when", "date", "max"] as const) if (f[k]) p.set(k, String(f[k]));
    p.set("ai", "1");
    p.set("filters", "1");
    return `${action}?${p}`;
  })();
  const clear = `${action}?${new URLSearchParams({ s: section, ...(f.q ? { q: f.q } : {}), ...(f.area ? { area: f.area } : {}) })}`;

  return (
    <div className="lg:flex lg:items-start lg:gap-7">
      <FilterSidebar action={action} section={section} f={f} counts={counts} trades={trades} />
      <section className="min-w-0 flex-1" aria-labelledby="results-title">
        {showing && (
          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] bg-soft px-3.5 py-2.5 text-[13px] font-semibold text-deep">
            <span>Showing: {showing.join(" · ")}</span>
            <Link href={change} className="font-extrabold text-accent">
              Change
            </Link>
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 id="results-title" className="text-[19px] font-extrabold tracking-[-0.01em] lg:text-[28px] lg:tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted lg:mt-1 lg:text-sm">
              {n} {unit}
              {sortNote}
            </p>
          </div>
          <FilterSheet action={action} section={section} f={f} counts={counts} trades={trades} />
          <Sort action={action} section={section} f={f} />
        </div>

        {n === 0 ? (
          <div className="rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center">
            <p className="text-[15px] font-bold">Nothing here yet</p>
            <p className="mt-1 text-[13px] text-muted">
              {f.q ? "Try a shorter word, or look in another section." : "New listings are added often. Try fewer filters, or another section."}
            </p>
            <Link href={clear} className="mt-3 inline-flex h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-bold">
              Clear filters
            </Link>
          </div>
        ) : section === "services" ? (
          <div className="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(290px,1fr))] lg:gap-4">
            {pros.map((c) => (
              <ProCard key={c.product.id} c={c} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-6">
            {rows.map((r, i) => (
              <ListingTile key={r.product.id} row={r} priority={i < 2} seatsLeft={seats[i]} />
            ))}
          </div>
        )}

        {shops && (shops.near.length > 0 || shops.more.length > 0) && (
          <div className="pt-8">
            <h2 className="mb-3 text-[19px] font-extrabold">{shops.near.length ? "Shops near you" : "Shops in Lagos"}</h2>
            <div className="cards lg:!grid-cols-3">
              {[...shops.near, ...shops.more].slice(0, 12).map((s) => (
                <ShopRow key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
