"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Sel = { ids: string[]; all: string[]; picked: Set<string>; toggle: (id: string) => void; setAll: (on: boolean) => void; clear: () => void };
const Ctx = createContext<Sel | null>(null);

// Ticked rows on this page, shared by the table and the bulk bar.
export function SelectionProvider({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const key = [...ids].sort().join(",");
  // A new page or filter drops ticks for rows no longer shown; a refresh keeps the rest.
  useEffect(() => setPicked((p) => new Set([...p].filter((id) => ids.includes(id)))), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo<Sel>(
    () => ({
      ids: [...picked],
      all: ids,
      picked,
      toggle: (id) =>
        setPicked((p) => {
          const n = new Set(p);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
      setAll: (on) => setPicked(on ? new Set(ids) : new Set()),
      clear: () => setPicked(new Set()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picked, key],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection() {
  return useContext(Ctx);
}

// The tick-all box in the table header.
export function SelectAll() {
  const s = useSelection();
  if (!s) return null;
  const n = s.picked.size;
  return (
    <input
      type="checkbox"
      aria-label="Select all rows on this page"
      className="size-4 accent-accent"
      checked={n > 0 && n === s.all.length}
      ref={(el) => {
        if (el) el.indeterminate = n > 0 && n < s.all.length;
      }}
      onChange={(e) => s.setAll(e.target.checked)}
    />
  );
}
