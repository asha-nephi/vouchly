import { Fragment } from "react";
import Link from "next/link";
import type { Density } from "./density";
import { hrefWith, PER_PAGE, type Params } from "./params";
import { SelectionProvider, SelectAll } from "./selection";
import { TableRows } from "./table-rows";

export type Column<R> = {
  id: string;
  label: string;
  cell: (r: R) => React.ReactNode;
  sortable?: boolean; // the URL uses ?sort=<id>
  money?: boolean; // right-aligned, tabular figures
  align?: "right" | "center";
  width?: string; // e.g. "w-28"
  wrap?: boolean; // let long text wrap (default: one line)
};

type State = { sort: string; dir: "asc" | "desc"; page: number; per: number; open: string | null };

const SIZE: Record<Density, { row: string; head: string; text: string }> = {
  compact: { row: "h-9", head: "h-9", text: "text-[13px]" },
  comfortable: { row: "h-[52px]", head: "h-11", text: "text-sm" },
};

// Dense, sortable table for the seller and admin areas. Computers only: phones keep their own layout.
export function DataTable<R>(props: {
  label: string;
  path: string;
  sp: Params;
  state: State;
  columns: Column<R>[];
  visible?: string[];
  rows: R[];
  rowId: (r: R) => string;
  rowLabel: (r: R) => string;
  total: number;
  density: Density;
  selectable?: boolean;
  canOpen?: boolean;
  bulk?: React.ReactNode;
  empty: React.ReactNode;
}) {
  const { label, path, sp, state, rows, total, density, selectable = false, canOpen = true } = props;
  const cols = props.visible ? props.visible.map((id) => props.columns.find((c) => c.id === id)).filter((c): c is Column<R> => !!c) : props.columns;
  const size = SIZE[density];
  const alignOf = (c: Column<R>) => (c.money || c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left");
  const cellClass = cols.map((c) => `px-3 ${alignOf(c)} ${c.money ? "tabular-nums" : ""} ${c.wrap ? "" : "whitespace-nowrap"} ${c.width ?? ""}`);
  const ids = rows.map(props.rowId);

  return (
    <SelectionProvider ids={ids}>
      <div className="hidden lg:block">
        {props.bulk}
        <div className="max-h-[calc(100dvh-210px)] min-h-[200px] overflow-auto rounded-[16px] border border-line bg-white">
          <table className={`w-full border-collapse ${size.text}`} aria-label={label} aria-rowcount={total}>
            <thead className="sticky top-0 z-10 bg-[#F3F5FA] text-xs font-extrabold text-muted">
              <tr className={`${size.head} border-b border-line`}>
                {selectable && (
                  <th scope="col" className="w-10 px-3 text-left">
                    <SelectAll />
                  </th>
                )}
                {cols.map((c, i) => {
                  const on = state.sort === c.id;
                  const nextDir = on && state.dir === "desc" ? "asc" : "desc";
                  return (
                    <th key={c.id} scope="col" aria-sort={on ? (state.dir === "asc" ? "ascending" : "descending") : undefined} className={`${cellClass[i]} font-extrabold`}>
                      {c.sortable ? (
                        <Link href={hrefWith(path, sp, { sort: c.id, dir: nextDir })} scroll={false} className="inline-flex items-center gap-1 rounded hover:text-ink">
                          {c.label}
                          <span aria-hidden="true" className={on ? "text-ink" : "opacity-30"}>
                            {on && state.dir === "asc" ? "▲" : "▼"}
                          </span>
                        </Link>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            {rows.length > 0 && (
              <TableRows
                rows={rows.map((r) => ({ id: props.rowId(r), label: props.rowLabel(r), cells: cols.map((c) => <Fragment key={c.id}>{c.cell(r)}</Fragment>) }))}
                cellClass={cellClass}
                rowClass={size.row}
                selectable={selectable}
                openId={state.open}
                canOpen={canOpen}
              />
            )}
          </table>
          {rows.length === 0 && <div className="px-6 py-12 text-center text-sm text-muted">{props.empty}</div>}
        </div>
        <Pager path={path} sp={sp} state={state} total={total} shown={rows.length} />
      </div>
    </SelectionProvider>
  );
}

function Pager({ path, sp, state, total, shown }: { path: string; sp: Params; state: State; total: number; shown: number }) {
  if (!total) return null;
  const from = (state.page - 1) * state.per + 1;
  const to = from + shown - 1;
  const last = Math.max(1, Math.ceil(total / state.per));
  const btn = "inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold";
  return (
    <nav aria-label="Pages" className="mt-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
      <span>
        {from}–{to} of {total}
      </span>
      <span className="flex items-center gap-1.5">
        Per page
        {PER_PAGE.map((n) => (
          <Link key={n} href={hrefWith(path, sp, { per: n === 25 ? null : n, page: null })} scroll={false} aria-current={state.per === n ? "true" : undefined} className={`${btn} ${state.per === n ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}>
            {n}
          </Link>
        ))}
      </span>
      <span className="flex gap-1.5">
        {state.page > 1 ? (
          <Link href={hrefWith(path, sp, { page: state.page === 2 ? null : state.page - 1 })} scroll={false} className={`${btn} border-line bg-white text-ink`}>
            Previous
          </Link>
        ) : (
          <span className={`${btn} border-line bg-white opacity-40`}>Previous</span>
        )}
        {state.page < last ? (
          <Link href={hrefWith(path, sp, { page: state.page + 1 })} scroll={false} className={`${btn} border-line bg-white text-ink`}>
            Next
          </Link>
        ) : (
          <span className={`${btn} border-line bg-white opacity-40`}>Next</span>
        )}
      </span>
    </nav>
  );
}

// A coloured status pill for table cells.
export function Pill({ children, tone = "grey" }: { children: React.ReactNode; tone?: "grey" | "blue" | "green" | "amber" | "red" }) {
  const c = { grey: "bg-chip text-ink", blue: "bg-soft text-deep", green: "bg-[#ddf3e4] text-[#1b6b3a]", amber: "bg-[#fdf0d5] text-[#8a5300]", red: "bg-[#fbebeb] text-[#b42318]" }[tone];
  return <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-bold ${c}`}>{children}</span>;
}
