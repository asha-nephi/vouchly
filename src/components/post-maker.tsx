"use client";

import { useState, useTransition } from "react";
import { makePost } from "@/app/(app)/shop/ai-actions";
import { showToast } from "@/components/toast";

const TYPES = [
  { value: "status", label: "WhatsApp status" },
  { value: "caption", label: "Instagram caption" },
  { value: "broadcast", label: "WhatsApp broadcast" },
];
const OFFLINE = "Couldn't reach Vouchly. Check your connection and try again.";
const LANGS = [
  { value: "en", label: "English" },
  { value: "pcm", label: "Pidgin" },
];

function Pills({ name, opts, value, onPick }: { name: string; opts: { value: string; label: string }[]; value: string; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onPick(o.value)}
          className={`h-10 rounded-full px-3.5 text-[13px] font-bold ${value === o.value ? "bg-ink text-white" : "border border-line bg-white text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// "Make a post": AI writes a post, we add the exact link. The seller can edit, copy or share it.
export default function PostMaker({ productId }: { productId?: string }) {
  const [type, setType] = useState("status");
  const [lang, setLang] = useState("en");
  const [text, setText] = useState("");
  const [tail, setTail] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const make = (v: number) => {
    setError("");
    start(async () => {
      // A dropped connection must not break the page.
      const res = await makePost({ productId, type, lang, version: v }).catch(() => null);
      if (!res) return setError(OFFLINE);
      if (!res.ok) return setError(res.error);
      setText(res.text);
      setTail(res.full.slice(res.text.length));
      setVersion(res.version);
    });
  };
  // A new choice starts again from the first version.
  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setText("");
    setVersion(0);
    setError("");
  };
  const full = text + tail;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      showToast("Post copied");
    } catch {
      setError("Couldn't copy. Press and hold the text to copy it.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Pills name="Type of post" opts={TYPES} value={type} onPick={pick(setType)} />
      <Pills name="Language" opts={LANGS} value={lang} onPick={pick(setLang)} />
      {text ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Your post (you can change it)</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:border-ink" />
          </label>
          <p className="whitespace-pre-line break-all rounded-[12px] bg-white/70 px-3 py-2 text-xs font-semibold text-muted">{tail.trim()}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className="h-11 rounded-full border border-line bg-white text-sm font-bold text-ink">
              Copy
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(full)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center rounded-full bg-[#1b6b3a] text-sm font-bold text-white"
            >
              Share to WhatsApp
            </a>
          </div>
          {version < 3 && (
            <button type="button" onClick={() => make(version + 1)} disabled={pending} className="h-10 self-start rounded-full px-1 text-sm font-bold text-accent disabled:opacity-60">
              {pending ? "Writing…" : `Try another (${3 - version} left today)`}
            </button>
          )}
        </>
      ) : (
        <button type="button" onClick={() => make(1)} disabled={pending} className="h-11 rounded-full bg-ink text-sm font-extrabold text-white disabled:opacity-60">
          {pending ? "Writing…" : "Make a post"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
