"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActive, setPrice, setStock, type EditResult } from "./actions";

const OFFLINE = "Couldn't reach Vouchly. Try again.";

// A short message at the bottom of the screen, gone after a few seconds.
function Toast({ text, bad, onDone }: { text: string; bad?: boolean; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 2600);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <span role="status" className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg ${bad ? "bg-[#B42318]" : "bg-ink"}`}>
      {text}
    </span>
  );
}

// Price or stock in a table row: tap to change, Enter to save, Esc to cancel.
export function InlineEdit({ id, field, shown, start, name, hint }: { id: string; field: "price" | "stock"; shown: React.ReactNode; start: string; name: string; hint?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(start);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, run] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const label = field === "price" ? "price" : "stock";

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const save = () =>
    run(async () => {
      const res: EditResult | null = await (field === "price" ? setPrice(id, value) : setStock(id, value)).catch(() => null);
      if (!res || res.error) return setError(res?.error ?? OFFLINE);
      setError("");
      setEditing(false);
      setToast(res.text ?? "Saved.");
      router.refresh();
    });

  return (
    <span className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      {editing ? (
        <form
          className="inline-flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {field === "price" && <span className="text-muted">₦</span>}
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                setError("");
                setValue(start);
              }
            }}
            inputMode="numeric"
            aria-label={`New ${label} for ${name}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field}-err-${id}` : undefined}
            placeholder={field === "stock" ? "No limit" : undefined}
            className="h-7 w-20 rounded-md border border-accent bg-white px-1.5 text-right tabular-nums outline-none"
          />
          <button type="submit" disabled={pending} className="h-7 rounded-md bg-accent px-2 text-xs font-extrabold text-white disabled:opacity-60">
            {pending ? "…" : "Save"}
          </button>
          {error && (
            <span id={`${field}-err-${id}`} role="alert" className="absolute right-0 top-8 z-20 w-56 whitespace-normal rounded-lg bg-[#FDE2E1] px-2 py-1.5 text-left text-xs font-bold text-[#B42318] shadow">
              {error}
            </span>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={hint ?? `Change the ${label}`}
          aria-label={`Change ${label} for ${name}`}
          className="rounded px-1 -mx-1 tabular-nums underline decoration-[#b4bccb] decoration-dashed underline-offset-4 hover:bg-soft hover:decoration-accent"
        >
          {shown}
        </button>
      )}
      {toast && <Toast text={toast} onDone={() => setToast("")} />}
    </span>
  );
}

// On/off switch: on means buyers can see and buy it.
export function ActiveSwitch({ id, on, name }: { id: string; on: boolean; name: string }) {
  const router = useRouter();
  const [now, setNow] = useState(on);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, run] = useTransition();
  useEffect(() => setNow(on), [on]);

  const flip = () => {
    const next = !now;
    setNow(next);
    run(async () => {
      const res = await setActive(id, next).catch(() => null);
      if (!res || res.error) {
        setNow(!next);
        return setToast({ text: res?.error ?? OFFLINE, bad: true });
      }
      setToast({ text: res.text ?? "Saved." });
      router.refresh();
    });
  };

  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        role="switch"
        aria-checked={now}
        aria-label={`${name}: buyers can see it`}
        disabled={pending}
        onClick={flip}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${now ? "bg-[#1D7A46]" : "bg-[#C8CEDA]"}`}
      >
        <span className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-all ${now ? "left-[19px]" : "left-[3px]"}`} />
      </button>
      <span className={`text-xs font-bold ${now ? "text-[#1D7A46]" : "text-muted"}`}>{now ? "On" : "Off"}</span>
      {toast && <Toast text={toast.text} bad={toast.bad} onDone={() => setToast(null)} />}
    </span>
  );
}
