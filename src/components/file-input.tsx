"use client";

import { useEffect, useRef } from "react";

// A file box that keeps its file when the form resets after an error.
export default function FileInput(props: { name: string; accept: string; required?: boolean; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const kept = useRef<File | null>(null);
  useEffect(() => {
    const input = ref.current;
    const form = input?.form;
    if (!input || !form) return;
    const refill = () =>
      setTimeout(() => {
        if (!kept.current) return;
        const dt = new DataTransfer();
        dt.items.add(kept.current);
        input.files = dt.files;
      }, 0);
    form.addEventListener("reset", refill);
    return () => form.removeEventListener("reset", refill);
  }, []);
  return <input ref={ref} type="file" {...props} onChange={(e) => (kept.current = e.target.files?.[0] ?? null)} />;
}
