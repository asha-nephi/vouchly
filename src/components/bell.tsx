"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Bell with an unread count. Checks again every minute while the app is open.
export default function Bell({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  useEffect(() => setN(initial), [initial]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/notifications/count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { n: number }) => setN(d.n))
        .catch(() => undefined);
    };
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={n ? `Notifications, ${n} new` : "Notifications"}
      className="relative flex size-10 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
      </svg>
      {n > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#d92d20] px-1 text-[11px] font-extrabold text-white ring-2 ring-bg">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
