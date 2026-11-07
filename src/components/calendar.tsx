"use client";

import { useState } from "react";
import { addDays } from "@/lib/dates";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const monthName = (y: number, m: number) =>
  new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));
const keyOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

type Props = {
  today: string; // YYYY-MM-DD, Lagos
  taken: Set<string>; // nights that can't be picked
  booked?: Set<string>; // shown as booked in toggle mode
} & (
  | { mode: "range"; start: string | null; end: string | null; onPick: (start: string | null, end: string | null) => void }
  | { mode: "toggle"; onToggle: (key: string) => void }
);

// One month at a time. Range mode picks check-in then check-out; toggle mode blocks days.
export default function Calendar(props: Props) {
  const [y0, m0] = props.today.split("-").map(Number);
  const [view, setView] = useState({ y: y0, m: m0 - 1 });
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const atStart = view.y === y0 && view.m === m0 - 1;
  const move = (n: number) => setView(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));

  const pick = (k: string) => {
    if (props.mode === "toggle") return props.onToggle(k);
    const { start, end, onPick } = props;
    if (!start || end || k <= start) return props.taken.has(k) ? undefined : onPick(k, null);
    // Every night from check-in up to check-out must be free.
    for (let n = start; n < k; n = addDays(n, 1)) if (props.taken.has(n)) return props.taken.has(k) ? undefined : onPick(k, null);
    onPick(start, k);
  };

  return (
    <div className="rounded-[20px] bg-white p-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={atStart} aria-label="Previous month" className="flex size-10 items-center justify-center rounded-full disabled:opacity-30">
          ‹
        </button>
        <p className="text-[15px] font-extrabold">{monthName(view.y, view.m)}</p>
        <button type="button" onClick={() => move(1)} aria-label="Next month" className="flex size-10 items-center justify-center rounded-full">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted" aria-hidden="true">
        {WEEK.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="grid">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const k = keyOf(view.y, view.m, i + 1);
          const past = k < props.today;
          const taken = props.taken.has(k);
          const booked = props.booked?.has(k);
          let tone = "";
          let disabled = past;
          if (props.mode === "range") {
            const { start, end } = props;
            const isEdge = k === start || k === end;
            const inside = start && end && k > start && k < end;
            // A taken night can still be a check-out day.
            const canCheckOut = start && !end && k > start;
            disabled = past || (taken && !canCheckOut);
            tone = isEdge ? "bg-ink text-white font-extrabold" : inside ? "bg-soft text-deep font-bold" : taken ? "text-[#b8bfcc] line-through" : "";
          } else {
            disabled = past || !!booked;
            tone = booked ? "bg-soft text-deep font-bold" : taken ? "bg-[#fbebeb] text-[#b42318] font-bold line-through" : "";
          }
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => pick(k)}
              aria-label={`${k}${taken ? (props.mode === "toggle" ? ", blocked" : ", booked") : ""}${booked ? ", booked" : ""}`}
              aria-pressed={props.mode === "toggle" ? taken : undefined}
              className={`mx-auto flex size-10 items-center justify-center rounded-full text-sm disabled:cursor-default ${past ? "text-[#c8ceda]" : ""} ${tone}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
