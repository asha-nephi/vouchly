"use client";

import { useRef, useState, useTransition } from "react";
import { writeListing } from "../../ai-actions";

const FIELDS = ["name", "about", "tags", "included"] as const;
type Saved = Partial<Record<(typeof FIELDS)[number], string>>;

// Shrinks the first picked photo to a small JPEG (768px max) so it's quick on slow data.
async function photoData(form: HTMLFormElement): Promise<string | undefined> {
  const input = form.querySelector<HTMLInputElement>('input[type="file"][name="photos"]');
  const file = input?.files?.[0];
  if (!file) return undefined;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return undefined;
  }
}

const field = (form: HTMLFormElement, name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;

// "Write it for me": drafts the name and description from a few words. The seller checks and saves.
export default function AiWriter({ kind }: { kind: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState("");
  const [error, setError] = useState("");
  const [before, setBefore] = useState<Saved | null>(null);
  const [pending, start] = useTransition();

  const write = () =>
    start(async () => {
      const form = box.current?.closest("form");
      if (!form) return;
      const res = await writeListing({ words, kind, image: await photoData(form) });
      if (!res.ok) return setError(res.error);
      const old: Saved = {};
      const next: Saved = { name: res.draft.name, about: res.draft.about, tags: res.draft.tags.join(", "), included: res.draft.included.join("\n") };
      for (const k of FIELDS) {
        const el = field(form, k);
        if (!el || !next[k]) continue;
        old[k] = el.value;
        el.value = next[k]!;
      }
      setBefore((b) => b ?? old);
      setOpen(false);
    });

  const undo = () => {
    const form = box.current?.closest("form");
    if (!form || !before) return;
    for (const k of FIELDS) {
      const el = field(form, k);
      if (el && before[k] !== undefined) el.value = before[k]!;
    }
    setBefore(null);
  };

  return (
    <div ref={box} className="-mt-2 flex flex-col gap-2">
      {before && (
        <p className="flex items-center justify-between gap-3 rounded-[14px] bg-soft px-3.5 py-2.5 text-[13px] font-semibold text-deep">
          Written with AI. Check it before saving.
          <button type="button" onClick={undo} className="h-9 shrink-0 rounded-full bg-white px-3.5 text-[13px] font-bold text-ink">
            Undo
          </button>
        </p>
      )}
      {!open && (
          <button type="button" onClick={() => setOpen(true)} className="flex h-10 items-center gap-1.5 self-start rounded-full bg-soft px-3.5 text-[13px] font-bold text-accent">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
            </svg>
            {before ? "Write again" : "Write it for me"}
          </button>
      )}
      {open && (
        <div className="flex flex-col gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Tell us about it in a few words</span>
            <textarea
              rows={2}
              value={words}
              maxLength={300}
              onChange={(e) => setWords(e.target.value)}
              placeholder="e.g. zobo 1 litre, ginger, no sugar"
              className="rounded-[14px] border border-[#d5dae4] px-3.5 py-2.5 text-[15px] outline-none placeholder:text-[#8a93a5] focus:border-ink"
            />
          </label>
          <p className="text-xs text-muted">We also look at your first new photo, if you added one. You can change anything before saving.</p>
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-[#b42318]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => (setError(""), write())} disabled={pending} className="h-11 flex-1 rounded-full bg-ink text-sm font-extrabold text-white disabled:opacity-60">
              {pending ? "Writing…" : "Write it"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full px-4 text-sm font-bold text-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
