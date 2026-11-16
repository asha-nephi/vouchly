"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Esc closes the side panel; opening it moves focus to its title, closing returns focus to the row.
export function PanelKeys({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  useEffect(() => {
    const from = document.activeElement as HTMLElement | null;
    document.getElementById("side-panel-title")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Leave Esc to open menus and dialogs first.
      if (document.querySelector("details[open], [role=dialog]")) return;
      router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (from?.isConnected) from.focus();
    };
  }, [closeHref, router]);
  return null;
}
