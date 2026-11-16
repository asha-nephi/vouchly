"use client";

import { useEffect, useState } from "react";

const keyFor = (day: string) => `vl_packed_${day}`;
function read(day: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(keyFor(day)) ?? "[]");
  } catch {
    return [];
  }
}

// "Packed" tick for one order. Kept on this device only; prints as an empty box to tick by hand.
export function PackedBox({ day, code }: { day: string; code: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(read(day).includes(code)), [day, code]);
  return (
    <input
      type="checkbox"
      aria-label={`Packed ${code}`}
      className="size-4 accent-[#1b6b3a] print:accent-black"
      checked={on}
      onChange={(e) => {
        const next = e.target.checked;
        setOn(next);
        try {
          const list = read(day).filter((c) => c !== code);
          localStorage.setItem(keyFor(day), JSON.stringify(next ? [...list, code] : list));
        } catch {
          // Private mode: the tick still shows until the page closes.
        }
      }}
    />
  );
}
