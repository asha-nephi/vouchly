"use client";

import { useState } from "react";
import { showToast } from "@/components/toast";

// Small "Copy" button for table cells. Doesn't open the row.
export default function CopyButton({ text, label, big = false }: { text: string; label: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      showToast("Link copied");
      setTimeout(() => setDone(false), 2000);
    } catch {
      showToast("Couldn't copy. Select the link and copy it.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`shrink-0 border border-line bg-white font-bold text-ink hover:bg-soft ${big ? "h-10 rounded-xl px-3.5 text-sm" : "h-7 rounded-full px-2.5 text-xs"}`}
    >
      {done ? "Copied" : big ? "Copy link" : "Copy"}
    </button>
  );
}
