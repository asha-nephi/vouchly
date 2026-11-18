"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/toast";
import { setCheckIn } from "./table-actions";

// Tick at the door. Shows at once, and goes back if saving fails.
export default function CheckInBox({ pid, code, name, on, big = false }: { pid: string; code: string; name: string; on: boolean; big?: boolean }) {
  const [checked, setChecked] = useState(on);
  const [pending, start] = useTransition();
  const router = useRouter();
  const change = (next: boolean) => {
    setChecked(next);
    start(async () => {
      const res: { error?: string; text?: string } = await setCheckIn(pid, code, next).catch(() => ({ error: "Couldn't reach Vouchly. Try again." }));
      if (res.error) {
        setChecked(!next);
        showToast(res.error);
        return;
      }
      showToast(`${name}: ${res.text}`);
      router.refresh();
    });
  };
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${big ? "h-10 rounded-full border border-line bg-white px-3 text-[13px] font-bold" : ""}`} onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => change(e.target.checked)}
        aria-label={`Checked in: ${name} (${code})`}
        className={`${big ? "size-5" : "size-4"} accent-[#1b6b3a]`}
      />
      {big ? (checked ? "In" : "Check in") : <span className={`text-xs font-bold ${checked ? "text-[#1b6b3a]" : "text-muted"}`}>{checked ? "In" : "Not yet"}</span>}
    </label>
  );
}
