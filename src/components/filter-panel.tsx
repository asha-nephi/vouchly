import Link from "next/link";
import { categoryLabel } from "@/lib/catalog";
import { filterCount, type Filters, type Section } from "@/lib/sections";
import AutoSubmit from "@/components/auto-submit";

type Count = { cat: string; n: number };
type TradeCount = { trade: string; n: number };
type Opt = { value: string; label: string };

const Title = ({ children }: { children: React.ReactNode }) => <legend className="mb-2.5 text-[13px] font-extrabold text-muted">{children}</legend>;

// A radio or checkbox on its own line.
function Choice({ type, name, value, label, checked }: { type: "radio" | "checkbox"; name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] lg:min-h-9">
      <input type={type} name={name} value={value} defaultChecked={checked} className="size-[18px] shrink-0 accent-accent" />
      {label}
    </label>
  );
}

function Radios({ title, name, value, opts }: { title: string; name: string; value?: string; opts: Opt[] }) {
  return (
    <fieldset>
      <Title>{title}</Title>
      {[{ value: "", label: "Any" }, ...opts].map((o) => (
        <Choice key={o.value} type="radio" name={name} value={o.value} label={o.label} checked={(value ?? "") === o.value} />
      ))}
    </fieldset>
  );
}

// Categories as a highlighted list with counts (still radios, so the form carries them).
function CategoryList({ title, value, counts }: { title: string; value?: string; counts: Count[] }) {
  if (!counts.length) return null;
  return (
    <fieldset>
      <Title>{title}</Title>
      {[{ cat: "", n: counts.reduce((s, c) => s + c.n, 0) }, ...counts].map((c) => (
        <label key={c.cat} className="block cursor-pointer">
          <input type="radio" name="cat" value={c.cat} defaultChecked={(value ?? "") === c.cat} className="peer sr-only" />
          <span className="flex min-h-11 items-center justify-between rounded-[10px] px-3 text-[15px] font-semibold peer-checked:bg-soft peer-checked:font-extrabold peer-focus-visible:ring-2 peer-focus-visible:ring-accent lg:min-h-9">
            {c.cat ? categoryLabel(c.cat) : "All"}
            <span className="font-semibold text-muted">{c.n}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// The kinds of work pros picked at sign-up, as a highlighted list.
function TradeList({ value, trades }: { value?: string; trades: TradeCount[] }) {
  return (
    <fieldset>
      <Title>Type of work</Title>
      {[{ trade: "", n: 0 }, ...trades].map((t) => (
        <label key={t.trade} className="block cursor-pointer">
          <input type="radio" name="trade" value={t.trade} defaultChecked={(value ?? "") === t.trade} className="peer sr-only" />
          <span className="flex min-h-11 items-center justify-between rounded-[10px] px-3 text-[15px] font-semibold peer-checked:bg-soft peer-checked:font-extrabold peer-focus-visible:ring-2 peer-focus-visible:ring-accent lg:min-h-9">
            {t.trade || "All"}
            {t.trade && <span className="font-semibold text-muted">{t.n}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Fields({ section, f, counts, trades }: { section: Section; f: Filters; counts: Count[]; trades: TradeCount[] }) {
  return (
    <>
      <input type="hidden" name="s" value={section} />
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.area && <input type="hidden" name="area" value={f.area} />}
      {f.sort && <input type="hidden" name="sort" value={f.sort} />}
      {f.max && <input type="hidden" name="max" value={f.max} />}
      {section === "services" && (
        <>
          {trades.length ? <TradeList value={f.trade} trades={trades} /> : <CategoryList title="Type of work" value={f.cat} counts={counts} />}
          <Radios title="When do you need it?" name="when" value={f.when} opts={[{ value: "tomorrow", label: "Free tomorrow" }, { value: "week", label: "This week" }]} />
          <fieldset>
            <Title>Price</Title>
            <Choice type="checkbox" name="price" value="fixed" label="Fixed price" checked={!f.price || f.price.includes("fixed")} />
            <Choice type="checkbox" name="price" value="quote" label="Price after a chat" checked={!f.price || f.price.includes("quote")} />
          </fieldset>
          <fieldset>
            <Title>Rating</Title>
            <Choice type="checkbox" name="r4" value="1" label="4 stars and up" checked={!!f.r4} />
          </fieldset>
        </>
      )}
      {section === "products" && (
        <>
          <CategoryList title="Category" value={f.cat} counts={counts} />
          <Radios title="How you get it" name="how" value={f.how} opts={[{ value: "pickup", label: "Pick up" }, { value: "drop_off", label: "Seller drops it off" }, { value: "rider", label: "Rider" }]} />
          <Radios title="Price" name="pr" value={f.pr} opts={[{ value: "u5", label: "Under ₦5,000" }, { value: "5-20", label: "₦5,000 to ₦20,000" }, { value: "o20", label: "Over ₦20,000" }]} />
        </>
      )}
      {section === "online" && (
        <>
          <Radios title="Type" name="type" value={f.type} opts={[{ value: "digital", label: "Downloads" }, { value: "session", label: "1-on-1 sessions" }, { value: "event", label: "Classes and events" }]} />
          <Radios title="Where" name="where" value={f.where} opts={[{ value: "online", label: "Online" }, { value: "person", label: "In person" }]} />
          <Radios title="Date" name="date" value={f.date} opts={[{ value: "week", label: "This week" }, { value: "month", label: "This month" }]} />
        </>
      )}
    </>
  );
}

// Computers: the left sidebar. Changes apply at once.
export function FilterSidebar({ action, section, f, counts, trades }: { action: string; section: Section; f: Filters; counts: Count[]; trades: TradeCount[] }) {
  return (
    <aside aria-label="Filters" className="hidden w-[240px] shrink-0 lg:block">
      <AutoSubmit action={action} className="flex flex-col gap-[22px]">
        <Fields section={section} f={f} counts={counts} trades={trades} />
        <noscript>
          <button type="submit" className="h-11 rounded-xl bg-ink px-4 text-sm font-extrabold text-white">
            Apply
          </button>
        </noscript>
      </AutoSubmit>
    </aside>
  );
}

// Phones: a "Filters" button that opens a bottom sheet. No JavaScript needed.
export function FilterSheet({ action, section, f, counts, trades }: { action: string; section: Section; f: Filters; counts: Count[]; trades: TradeCount[] }) {
  const n = filterCount(f);
  const clear = new URLSearchParams({ s: section, ...(f.q ? { q: f.q } : {}), ...(f.area ? { area: f.area } : {}) });
  return (
    <details className="sheet lg:hidden" open={f.open}>
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters
        {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-extrabold text-white">{n}</span>}
      </summary>
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[22px] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <form action={action} className="flex flex-col gap-5">
          <h2 className="text-lg font-extrabold">Filters</h2>
          <Fields section={section} f={f} counts={counts} trades={trades} />
          <div className="sticky bottom-0 -mx-4 flex gap-2.5 border-t border-line bg-white px-4 pt-3">
            <Link href={`${action}?${clear}`} className="flex h-12 flex-1 items-center justify-center rounded-[14px] border border-line text-[15px] font-bold">
              Clear
            </Link>
            <button type="submit" className="h-12 flex-[2] rounded-[14px] bg-ink text-[15px] font-extrabold text-white">
              Show results
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
