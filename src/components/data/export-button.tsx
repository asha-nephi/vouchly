"use client";

import { useState, useTransition } from "react";

// A page's server action: the filter query (and ticked ids, if any) → CSV text, or null.
export type ExportAction = (query: string, ids?: string[]) => Promise<string | null>;

export function downloadCsv(csv: string, name: string) {
  const day = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${day}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "Export CSV": everything the current filters show, in the visible columns.
export function ExportButton({ action, query, filename }: { action: ExportAction; query: string; filename: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            const csv = await action(query).catch(() => null);
            if (!csv) return setError("Couldn't make the file. Try again.");
            downloadCsv(csv, filename);
          });
        }}
        className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold text-ink disabled:opacity-60"
      >
        {pending ? "Making file…" : "Export CSV"}
      </button>
      {error && (
        <span role="alert" className="text-xs font-semibold text-[#b42318]">
          {error}
        </span>
      )}
    </span>
  );
}
