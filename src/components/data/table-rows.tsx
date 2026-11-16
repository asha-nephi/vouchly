"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSelection } from "./selection";

export type RowData = { id: string; label: string; cells: React.ReactNode[] };

// Table rows: click or Enter opens the side panel, Space ticks, arrow keys move.
export function TableRows({ rows, cellClass, rowClass, selectable, openId, canOpen }: { rows: RowData[]; cellClass: string[]; rowClass: string; selectable: boolean; openId: string | null; canOpen: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const sel = useSelection();

  const open = (id: string) => {
    if (!canOpen) return;
    const p = new URLSearchParams(params.toString());
    p.set("open", id);
    router.push(`${path}?${p}`, { scroll: false });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    const tr = e.currentTarget;
    if (e.target !== tr) return; // typing in an input inside the row
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling) as HTMLElement | null;
      next?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(id);
    } else if (e.key === " " && selectable && sel) {
      e.preventDefault();
      sel.toggle(id);
    }
  };

  return (
    <tbody>
      {rows.map((r) => {
        const on = sel?.picked.has(r.id) ?? false;
        return (
          <tr
            key={r.id}
            tabIndex={0}
            aria-selected={selectable ? on : undefined}
            aria-current={openId === r.id ? "true" : undefined}
            onKeyDown={(e) => onKey(e, r.id)}
            onClick={(e) => {
              // Links, buttons and inputs inside a row do their own thing.
              if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;
              open(r.id);
            }}
            className={`${rowClass} border-b border-line outline-none last:border-b-0 hover:bg-[#F3F5FA] focus-visible:bg-soft/60 focus-visible:shadow-[inset_3px_0_0_var(--color-accent)] ${canOpen ? "cursor-pointer" : ""} ${on ? "bg-soft/50" : ""} ${openId === r.id ? "bg-soft/70" : ""}`}
          >
            {selectable && (
              <td className="w-10 px-3">
                <input type="checkbox" className="size-4 align-middle accent-accent" aria-label={`Select ${r.label}`} checked={on} onChange={() => sel?.toggle(r.id)} tabIndex={-1} />
              </td>
            )}
            {r.cells.map((c, i) => (
              <td key={i} className={cellClass[i]}>
                {c}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}
