"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveColumns } from "./actions";

type Col = { id: string; label: string };

// Gear button: tick columns on or off and drag (or use ↑ ↓) to reorder. Saved per person per page.
export function ColumnPicker({ page, columns, visible, fallback, locked = [] }: { page: string; columns: Col[]; visible: string[]; fallback: string[]; locked?: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Shown columns first (in order), then hidden ones.
  const start = () => [...visible.map((id) => columns.find((c) => c.id === id)!).filter(Boolean), ...columns.filter((c) => !visible.includes(c.id))];
  const [order, setOrder] = useState<Col[]>(start);
  const [on, setOn] = useState<Set<string>>(new Set(visible));
  const [drag, setDrag] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setOrder(start());
    setOn(new Set(visible));
    setError("");
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((o) => {
      const n = [...o];
      const [c] = n.splice(from, 1);
      n.splice(to, 0, c);
      return n;
    });
  };
  const save = (ids: string[]) =>
    run(async () => {
      const res = await saveColumns(page, ids).catch(() => null);
      if (!res?.ok) return setError("Couldn't save. Try again.");
      setOpen(false);
      router.refresh();
    });

  return (
    <div ref={box} className="relative">
      <button type="button" aria-expanded={open} aria-label="Choose columns" onClick={() => setOpen((v) => !v)} className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink hover:bg-chip">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Columns" className="absolute right-0 top-11 z-30 w-72 rounded-[14px] border border-line bg-white p-3 shadow-[0_18px_40px_-20px_rgba(20,33,61,0.45)]">
          <p className="pb-2 text-[13px] font-extrabold">Columns</p>
          <ul className="flex max-h-[50dvh] flex-col gap-0.5 overflow-y-auto">
            {order.map((c, i) => (
              <li
                key={c.id}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag !== null) move(drag, i);
                  setDrag(null);
                }}
                className={`flex h-9 items-center gap-2 rounded-[8px] px-1.5 text-[13px] ${drag === i ? "bg-soft" : "hover:bg-chip"}`}
              >
                <span aria-hidden="true" className="cursor-grab text-muted">
                  ⠿
                </span>
                <label className="flex flex-1 items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-accent"
                    checked={on.has(c.id)}
                    disabled={locked.includes(c.id)}
                    onChange={() =>
                      setOn((s) => {
                        const n = new Set(s);
                        if (n.has(c.id)) n.delete(c.id);
                        else n.add(c.id);
                        return n;
                      })
                    }
                  />
                  {c.label}
                </label>
                <button type="button" aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-6 place-items-center rounded text-muted hover:bg-white disabled:opacity-25">
                  ↑
                </button>
                <button type="button" aria-label={`Move ${c.label} down`} disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="grid size-6 place-items-center rounded text-muted hover:bg-white disabled:opacity-25">
                  ↓
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="pt-2 text-xs font-semibold text-[#b42318]">
              {error}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
            <button type="button" disabled={pending || on.size === 0} onClick={() => save(order.filter((c) => on.has(c.id)).map((c) => c.id))} className="h-8 rounded-full bg-ink px-3.5 text-[13px] font-bold text-white disabled:opacity-60">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" disabled={pending} onClick={() => save(fallback)} className="h-8 px-2 text-[13px] font-bold text-accent">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
