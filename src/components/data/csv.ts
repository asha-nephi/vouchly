// CSV export. Formula-safe: cells starting with = + - @ (or tab/CR) get a leading ' so Excel won't run them.

export type CsvColumn<R> = { id: string; label: string; csv: (r: R) => string | number | null | undefined };

export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Rows → CSV text, in the order of `visible` (column ids) when given.
export function toCsv<R>(columns: CsvColumn<R>[], rows: R[], visible?: string[]): string {
  const cols = visible ? visible.map((id) => columns.find((c) => c.id === id)).filter((c): c is CsvColumn<R> => !!c) : columns;
  const lines = [cols.map((c) => csvCell(c.label)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvCell(c.csv(r))).join(","));
  // BOM so Excel reads ₦ and names correctly.
  return "﻿" + lines.join("\r\n");
}

// Naira for CSV: plain number, no symbol, so spreadsheets can add it up.
export const nairaCsv = (kobo: number | null | undefined) => (kobo == null ? "" : (kobo / 100).toFixed(2));
