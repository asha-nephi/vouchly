"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSelection } from "./selection";
import type { BulkResult } from "./bulk";
import { downloadCsv, type ExportAction } from "./export-button";

// pick: the action needs one choice first, like which collection. write: it needs a short message first.
export type BulkAction = {
  label: string;
  run: (ids: string[], value?: string) => Promise<BulkResult>;
  confirm?: string;
  pick?: { value: string; label: string }[];
  write?: { placeholder: string; send: string };
};

const OFFLINE = "Couldn't reach Vouchly. Check your connection and try again.";

// Shows when rows are ticked: "3 selected · Mark ready · Export CSV · Clear".
export function BulkBar({ actions, exportCsv, query, filename }: { actions: BulkAction[]; exportCsv?: ExportAction; query?: string; filename?: string }) {
  const sel = useSelection();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<{ label: string; res: BulkResult } | null>(null);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState<BulkAction | null>(null);
  const [text, setText] = useState("");
  if (!sel) return null;
  const n = sel.picked.size;
  if (!n && !result && !error) return null;

  const run = (a: BulkAction, value?: string) => {
    if (a.confirm && !window.confirm(a.confirm.replace("{n}", String(n)))) return;
    const ids = sel.ids;
    setError("");
    setResult(null);
    setBusy(a.label);
    start(async () => {
      const res = await a.run(ids, value).catch(() => null);
      setBusy("");
      if (!res) return setError(OFFLINE);
      setResult({ label: a.label, res });
      // Keep the ones that failed ticked so they can be tried again.
      sel.setAll(false);
      res.failed.forEach((f) => sel.toggle(f.id));
      router.refresh();
    });
  };

  const exportPicked = () => {
    if (!exportCsv) return;
    setError("");
    setBusy("Export CSV");
    start(async () => {
      const csv = await exportCsv(query ?? "", sel.ids).catch(() => null);
      setBusy("");
      if (!csv) return setError("Couldn't make the file. Try again.");
      downloadCsv(csv, filename ?? "vouchly");
    });
  };

  const btn = "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-bold disabled:opacity-50";
  return (
    <div className="mb-2.5 rounded-[14px] bg-ink px-3 py-2 text-white" role="region" aria-label="Selected rows">
      <div className="flex flex-wrap items-center gap-1.5">
        {n > 0 && <span className="pr-1.5 text-[13px] font-extrabold">{n} selected</span>}
        {n > 0 &&
          actions.map((a) =>
            a.pick ? (
              <select
                key={a.label}
                aria-label={a.label}
                disabled={pending}
                value=""
                onChange={(e) => e.target.value && run(a, e.target.value)}
                className={`${btn} cursor-pointer border-0 bg-white/12 pr-7 text-white hover:bg-white/20 [&>option]:text-ink`}
              >
                <option value="">{busy === a.label ? "Working…" : `${a.label}…`}</option>
                {a.pick.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <button
                key={a.label}
                type="button"
                disabled={pending}
                aria-expanded={a.write ? writing === a : undefined}
                onClick={() => (a.write ? setWriting(writing === a ? null : a) : run(a))}
                className={`${btn} ${writing === a ? "bg-white text-ink" : "bg-white/12 hover:bg-white/20"}`}
              >
                {busy === a.label ? "Working…" : a.label}
              </button>
            ),
          )}
        {n > 0 && exportCsv && (
          <button type="button" disabled={pending} onClick={exportPicked} className={`${btn} bg-white/12 hover:bg-white/20`}>
            {busy === "Export CSV" ? "Making file…" : "Export CSV"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            sel.clear();
            setResult(null);
            setError("");
          }}
          className={`${btn} ml-auto text-[#C9D3EE] hover:text-white`}
        >
          {n > 0 ? "Clear" : "Close"}
        </button>
      </div>
      {writing?.write && n > 0 && (
        <form
          className="mt-2 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length < 3) return setError("Please write your message.");
            run(writing, text.trim());
            setWriting(null);
            setText("");
          }}
        >
          <label className="sr-only" htmlFor="bulk-write">
            {writing.label}
          </label>
          <textarea
            id="bulk-write"
            rows={2}
            maxLength={600}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={writing.write.placeholder}
            className="min-h-[52px] flex-1 rounded-[10px] border-0 bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-[#8a93a5]"
          />
          <button type="submit" disabled={pending} className={`${btn} h-9 bg-accent px-4 hover:bg-[#2340bd]`}>
            {writing.write.send.replace("{n}", String(n))}
          </button>
        </form>
      )}
      <div aria-live="polite">
        {result && (
          <div className="mt-1.5 text-[13px]">
            <p className="font-bold">
              {result.label}: done {result.res.done} of {result.res.total}.
            </p>
            {result.res.failed.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-[#FFD6D6]">
                {result.res.failed.map((f) => (
                  <li key={f.id}>
                    {f.label}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {error && <p className="mt-1.5 text-[13px] font-bold text-[#FFD6D6]">{error}</p>}
      </div>
    </div>
  );
}
