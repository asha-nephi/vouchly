"use client";

import { useState } from "react";

// A guest's private order link, to copy or send to themselves.
export default function SaveLink({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="w-full rounded-[20px] bg-soft p-4 text-left">
      <p className="text-[15px] font-extrabold text-ink">Save your order link</p>
      <p className="mt-0.5 text-[13px] text-deep">You don&apos;t have an account, so this link is how you open order {code} on any phone.</p>
      <p className="mt-2 break-all rounded-[12px] bg-white px-3 py-2 text-[13px] font-semibold text-ink">{url}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="h-11 rounded-full bg-white text-sm font-bold text-ink">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`My Vouchly order ${code}: ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-full bg-[#1b6b3a] text-sm font-bold text-white"
        >
          Send to WhatsApp
        </a>
      </div>
    </section>
  );
}
