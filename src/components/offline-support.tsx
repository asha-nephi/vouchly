"use client";

import { useEffect, useState } from "react";

// Starts the small service worker (it shows an offline page if a refresh fails)
// and shows a thin bar while the phone has no connection.
export default function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // After the page has loaded, so it never slows the first visit.
      const start = () => navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] bg-ink px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] text-center text-[13px] font-semibold text-white">
      You&apos;re offline. Some things won&apos;t load until you&apos;re back online.
    </div>
  );
}
