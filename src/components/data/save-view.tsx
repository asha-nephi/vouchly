"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveView, type ViewState } from "./actions";

// "Save view": name the current filters so they're one click away next time.
export function SaveView({ page, path, query }: { page: string; path: string; query: string }) {
  const [state, act, pending] = useActionState<ViewState, FormData>(saveView, {});
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center rounded-full px-2 text-[13px] font-bold text-accent">
        + Save view
      </button>
    );
  return (
    <form action={act} className="inline-flex items-center gap-1.5" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="query" value={query} />
      <label className="sr-only" htmlFor={`view-${page}`}>
        View name
      </label>
      <input ref={input} id={`view-${page}`} name="name" maxLength={40} placeholder="e.g. Needs me now" className="h-8 w-44 rounded-full border border-[#d5dae4] bg-white px-3 text-[13px] outline-none focus:border-ink" />
      <button disabled={pending} className="h-8 rounded-full bg-ink px-3 text-[13px] font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-8 px-1.5 text-[13px] font-bold text-muted">
        Cancel
      </button>
      {state.error && (
        <span role="alert" className="text-xs font-semibold text-[#b42318]">
          {state.error}
        </span>
      )}
    </form>
  );
}
