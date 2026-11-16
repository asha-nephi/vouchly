// URL helpers for the data tables. Filters, sort, page and the open row all live in the URL.

export type Params = Record<string, string | string[] | undefined>;
export const PER_PAGE = [25, 50, 100] as const;

// Keys that are not filters.
export const TABLE_KEYS = ["sort", "dir", "page", "per", "open", "q"];

// Plain string → string map, first value wins.
export function flat(sp: Params): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== "") out[k] = s;
  }
  return out;
}

// Build a link to the same page with some params changed. null or "" removes a param.
export function hrefWith(path: string, sp: Params, change: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams(flat(sp));
  for (const [k, v] of Object.entries(change)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, String(v));
  }
  // A new filter or sort starts again at page 1.
  if (!("page" in change) && Object.keys(change).some((k) => k !== "open")) p.delete("page");
  const q = p.toString();
  return q ? `${path}?${q}` : path;
}

// Read sort, paging, search and the open row, checked against what the page allows.
export function tableState(sp: Params, opts: { sorts: string[]; sort: string; dir?: "asc" | "desc" }) {
  const f = flat(sp);
  const sort = opts.sorts.includes(f.sort) ? f.sort : opts.sort;
  const dir: "asc" | "desc" = f.dir === "asc" || f.dir === "desc" ? f.dir : (opts.dir ?? "desc");
  const perN = Number(f.per);
  const per = (PER_PAGE as readonly number[]).includes(perN) ? perN : 25;
  const page = Math.max(1, Math.floor(Number(f.page)) || 1);
  return { sort, dir, per, page, offset: (page - 1) * per, q: (f.q ?? "").trim().slice(0, 100), open: f.open ?? null };
}

// The filter part of the URL (no paging or open row), used for saved views and CSV.
export function viewQuery(sp: Params) {
  const p = new URLSearchParams(flat(sp));
  for (const k of ["page", "open"]) p.delete(k);
  return p.toString();
}
