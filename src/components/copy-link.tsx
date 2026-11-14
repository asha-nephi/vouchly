"use client";

import { useState } from "react";
import { showToast } from "@/components/toast";

// A link with copy and WhatsApp buttons.
export default function CopyLink({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div>
      <p className="break-all rounded-[12px] bg-white px-3 py-2.5 text-[13px] font-semibold text-ink">{url}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="h-11 rounded-full bg-white text-sm font-bold text-ink">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-full bg-[#1b6b3a] text-sm font-bold text-white"
        >
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
