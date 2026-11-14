"use client";

import { useEffect, useState } from "react";

// Small message that goes away after 3 seconds. Call showToast("Saved") from any client code.
export const showToast = (message: string) => window.dispatchEvent(new CustomEvent("vl-toast", { detail: message }));

export default function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 3000);
    };
    window.addEventListener("vl-toast", on);
    return () => {
      window.removeEventListener("vl-toast", on);
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md justify-center">
      <p className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_24px_rgba(20,33,61,0.25)]">{msg}</p>
    </div>
  );
}
