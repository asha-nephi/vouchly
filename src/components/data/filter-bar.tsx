import Link from "next/link";
import { deleteView } from "./actions";
import { listViews, MAX_VIEWS } from "./views";
import { flat, hrefWith, TABLE_KEYS, viewQuery, type Params } from "./params";
import { SaveView } from "./save-view";

export type FilterDef = {
  id: string; // the URL param
  label: string;
  options?: { value: string; label: string }[];
  custom?: "date"; // also allow a custom range: <id>_from and <id>_to
};

const chip = "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold";
const menu = "absolute left-0 top-10 z-30 w-64 rounded-[14px] border border-line bg-white p-2 shadow-[0_18px_40px_-20px_rgba(20,33,61,0.45)]";

// Search, "Add filter", filter chips and saved views. Plain links and forms: no client code needed.
export async function FilterBar({ path, sp, page, filters, search = "Search", presets = [], tools }: { path: string; sp: Params; page: string; filters: FilterDef[]; search?: string; presets?: { name: string; query: string }[]; tools?: React.ReactNode }) {
  const f = flat(sp);
  const views = await listViews(page);
  const current = viewQuery(sp);
  const active = filters.flatMap((d) => {
    const out: { key: string; text: string }[] = [];
    if (f[d.id]) out.push({ key: d.id, text: `${d.label} = ${d.options?.find((o) => o.value === f[d.id])?.label ?? f[d.id]}` });
    if (d.custom && f[`${d.id}_from`]) out.push({ key: `${d.id}_from`, text: `${d.label} from ${f[`${d.id}_from`]}` });
    if (d.custom && f[`${d.id}_to`]) out.push({ key: `${d.id}_to`, text: `${d.label} to ${f[`${d.id}_to`]}` });
    return out;
  });
  const clearAll = Object.fromEntries([...filters.flatMap((d) => [d.id, `${d.id}_from`, `${d.id}_to`]), "q"].map((k) => [k, null]));
  // Keep everything except search, page and the open row when searching.
  const keep = Object.entries(f).filter(([k]) => !["q", "page", "open"].includes(k));

  return (
    <div className="mb-3 hidden flex-col gap-2.5 lg:flex">
      <div className="flex flex-wrap items-center gap-2">
        <form action={path} method="get" role="search" className="flex min-w-[220px] flex-1 items-center">
          {keep.map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="sr-only" htmlFor={`q-${page}`}>
            {search}
          </label>
          <input id={`q-${page}`} name="q" type="search" defaultValue={f.q ?? ""} placeholder={search} className="h-9 w-full max-w-[360px] rounded-full border border-[#d5dae4] bg-white px-3.5 text-[13px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10" />
        </form>
        {filters.length > 0 && (
          <details className="relative">
            <summary className={`${chip} cursor-pointer list-none border border-line bg-white text-ink [&::-webkit-details-marker]:hidden`}>+ Add filter</summary>
            <div className={menu}>
              {filters.map((d) => (
                <div key={d.id} className="border-b border-line py-1.5 last:border-b-0">
                  <p className="px-2 pb-1 text-xs font-extrabold text-muted">{d.label}</p>
                  <div className="flex flex-wrap gap-1 px-1">
                    {d.options?.map((o) => (
                      <Link key={o.value} href={hrefWith(path, sp, { [d.id]: o.value, open: null })} scroll={false} aria-current={f[d.id] === o.value ? "true" : undefined} className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-bold ${f[d.id] === o.value ? "bg-ink text-white" : "bg-chip text-ink hover:bg-soft"}`}>
                        {o.label}
                      </Link>
                    ))}
                  </div>
                  {d.custom === "date" && (
                    <form action={path} method="get" className="mt-1.5 flex items-end gap-1.5 px-1">
                      {Object.entries(f)
                        .filter(([k]) => ![d.id, `${d.id}_from`, `${d.id}_to`, "page", "open"].includes(k))
                        .map(([k, v]) => (
                          <input key={k} type="hidden" name={k} value={v} />
                        ))}
                      <label className="flex flex-col text-[11px] font-bold text-muted">
                        From
                        <input type="date" name={`${d.id}_from`} defaultValue={f[`${d.id}_from`]} className="h-8 rounded-[8px] border border-line px-1.5 text-xs text-ink" />
                      </label>
                      <label className="flex flex-col text-[11px] font-bold text-muted">
                        To
                        <input type="date" name={`${d.id}_to`} defaultValue={f[`${d.id}_to`]} className="h-8 rounded-[8px] border border-line px-1.5 text-xs text-ink" />
                      </label>
                      <button className="h-8 rounded-full bg-ink px-2.5 text-xs font-bold text-white">Go</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
        {tools && <div className="ml-auto flex items-center gap-2">{tools}</div>}
      </div>

      {(active.length > 0 || f.q) && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {f.q && (
            <Link href={hrefWith(path, sp, { q: null })} scroll={false} className={`${chip} bg-soft text-deep`}>
              Search: {f.q} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove</span>
            </Link>
          )}
          {active.map((a) => (
            <Link key={a.key} href={hrefWith(path, sp, { [a.key]: null })} scroll={false} className={`${chip} bg-soft text-deep`}>
              {a.text} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove</span>
            </Link>
          ))}
          <Link href={hrefWith(path, sp, clearAll)} scroll={false} className="px-2 text-[13px] font-bold text-accent">
            Clear filters
          </Link>
        </div>
      )}

      {(presets.length > 0 || views.length > 0 || current) && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Saved views">
          <span className="pr-1 text-xs font-extrabold text-muted">Views</span>
          <Link href={keepTable(path, sp, "")} scroll={false} className={`${chip} ${!current || onlyTable(current) ? "bg-ink text-white" : "border border-line bg-white text-ink"}`}>
            All
          </Link>
          {presets.map((v) => (
            <Link key={`p-${v.name}`} href={keepTable(path, sp, v.query)} scroll={false} className={`${chip} ${sameView(current, v.query) ? "bg-ink text-white" : "border border-line bg-white text-ink"}`}>
              {v.name}
            </Link>
          ))}
          {views.map((v) => (
            <span key={v.id} className={`${chip} pr-1 ${sameView(current, v.query) ? "bg-ink text-white" : "border border-line bg-white text-ink"}`}>
              <Link href={keepTable(path, sp, v.query)} scroll={false}>
                {v.name}
              </Link>
              <form action={deleteView}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="path" value={path} />
                <button aria-label={`Remove view ${v.name}`} className="grid size-6 place-items-center rounded-full opacity-60 hover:bg-black/10 hover:opacity-100">
                  ×
                </button>
              </form>
            </span>
          ))}
          {current && !onlyTable(current) && views.length < MAX_VIEWS && !views.some((v) => sameView(current, v.query)) && <SaveView page={page} path={path} query={current} />}
        </div>
      )}
    </div>
  );
}

// Filter params only (no sort, paging or open row), sorted, so two views compare fairly.
function filterPart(q: string) {
  const p = new URLSearchParams(q);
  for (const k of TABLE_KEYS) if (k !== "q") p.delete(k);
  p.sort();
  return p.toString();
}
const onlyTable = (q: string) => filterPart(q) === "";
const sameView = (a: string, b: string) => filterPart(a) === filterPart(b);

// Open a view but keep the person's sort and page size.
function keepTable(path: string, sp: Params, query: string) {
  const f = flat(sp);
  const p = new URLSearchParams(query);
  for (const k of ["sort", "dir", "per"]) if (f[k] && !p.has(k)) p.set(k, f[k]);
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}
