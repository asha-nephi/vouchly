import Link from "next/link";
import { PanelKeys } from "./panel-keys";

// The table and, when a row is open, the side panel. From 1280px the panel sits beside the table; below that it covers it.
export function DataLayout({ panel, children }: { panel?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="xl:flex xl:items-start xl:gap-4">
      <div className="min-w-0 flex-1">{children}</div>
      {panel}
    </div>
  );
}

// Detail of one record, on the right. ?open=<id> keeps it open on refresh; Esc or × closes it.
export function SidePanel({ title, sub, closeHref, children }: { title: string; sub?: React.ReactNode; closeHref: string; children: React.ReactNode }) {
  return (
    <>
      <Link href={closeHref} scroll={false} aria-label="Close" tabIndex={-1} className="fixed inset-0 z-40 hidden bg-ink/25 lg:block xl:hidden" />
      <aside
        id="side-panel"
        aria-labelledby="side-panel-title"
        className="fixed inset-y-0 right-0 z-50 hidden w-[480px] max-w-[90vw] flex-col overflow-hidden bg-white shadow-[-20px_0_50px_-25px_rgba(20,33,61,0.5)] lg:flex xl:sticky xl:top-4 xl:z-auto xl:h-[calc(100dvh-2rem)] xl:shrink-0 xl:rounded-[16px] xl:border xl:border-line xl:shadow-none"
      >
        <PanelKeys closeHref={closeHref} />
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="side-panel-title" tabIndex={-1} className="truncate text-lg font-extrabold outline-none">
              {title}
            </h2>
            {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
          </div>
          <Link href={closeHref} scroll={false} aria-label="Close panel" className="grid size-9 shrink-0 place-items-center rounded-full bg-chip text-ink hover:bg-soft">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">{children}</div>
      </aside>
    </>
  );
}
