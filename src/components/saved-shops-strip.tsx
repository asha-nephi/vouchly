import Link from "next/link";
import { initials, toneFor } from "@/lib/initials";

type Saved = { id: string; name: string; slug: string; area: string; isOpen: boolean };

// A row of the buyer's saved shops, to get back to them in one tap.
export default function SavedShopsStrip({ list }: { list: Saved[] }) {
  if (!list.length) return null;
  return (
    <section aria-labelledby="saved-shops" className="px-4 pt-5 lg:px-0 lg:pb-5 lg:pt-0">
      <h2 id="saved-shops" className="mb-2.5 text-base font-extrabold">
        Your shops
      </h2>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {list.map((s) => (
          <Link key={s.id} href={`/s/${s.slug}`} className="flex h-14 max-w-[220px] shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-white pl-2 pr-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ background: toneFor(s.name) }} aria-hidden="true">
              {initials(s.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{s.name}</span>
              <span className="block truncate text-xs font-semibold text-muted">{s.isOpen ? s.area : "Closed for now"}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
