"use client";

import { useEffect, useState } from "react";

// What people see instead of a blank screen when a page fails, most often because the connection dropped.
// It tries again by itself when the phone is back online.
export default function ErrorScreen({ retry }: { retry: () => void }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const back = () => {
      setOffline(false);
      retry();
    };
    const gone = () => setOffline(true);
    window.addEventListener("online", back);
    window.addEventListener("offline", gone);
    return () => {
      window.removeEventListener("online", back);
      window.removeEventListener("offline", gone);
    };
  }, [retry]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[380px] flex-col items-center justify-center px-4 py-10 text-center">
      <p className="mb-7 text-[22px] font-extrabold tracking-[-0.02em] text-ink">Vouchly</p>
      <h1 className="text-[22px] font-extrabold text-ink">{offline ? "You're offline" : "This page didn't load"}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {offline ? "We can't reach Vouchly right now. Check your data or Wi-Fi." : "The connection may be slow, or something went wrong on our side."}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-muted">Nothing is lost. Your basket and orders are safe.</p>
      <button type="button" onClick={retry} className="mt-6 h-[52px] w-full rounded-2xl bg-ink text-[15px] font-extrabold text-white">
        Try again
      </button>
      {offline && <p className="mt-3.5 text-[13px] text-muted">We&apos;ll try again by ourselves when you&apos;re back online.</p>}
      <a href="/home" className="mt-3 text-sm font-bold text-accent">
        Go to the home page
      </a>
    </main>
  );
}
