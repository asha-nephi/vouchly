"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// A thin bar at the top that shows the moment a link is tapped,
// so a slow page change never looks like nothing happened.
export default function NavProgress() {
  const path = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => setBusy(false), [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setBusy(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Never stay stuck if a page change is cancelled.
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 10000);
    return () => clearTimeout(t);
  }, [busy]);

  if (!busy) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden" role="progressbar" aria-label="Loading">
      <div className="nav-progress h-full w-1/3 rounded-full bg-accent" />
    </div>
  );
}
