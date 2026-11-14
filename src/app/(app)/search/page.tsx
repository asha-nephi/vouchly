import { requireUser } from "@/lib/auth";
import { AREAS } from "@/lib/catalog";
import { readFilters, toSection } from "@/lib/sections";
import TabBar from "@/components/tab-bar";
import BrowseView, { SectionSwitch } from "@/components/browse-view";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  // Old links used ?kind=class|digital; they now live in Online.
  const oldKind = params.kind === "class" || params.kind === "digital" ? params.kind : null;
  const section = oldKind ? "online" : toSection(typeof params.s === "string" ? params.s : null);
  const f = readFilters(oldKind ? { ...params, type: oldKind === "digital" ? "digital" : "event" } : params);
  const picked = typeof params.area === "string" && (AREAS as readonly string[]).includes(params.area) ? params.area : null;
  const area = picked ?? user.area ?? "Ikeja";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28 lg:max-w-[1280px] lg:px-6 lg:pb-14 lg:pt-7">
      <div className="flex flex-col gap-4 px-4 pt-4 lg:hidden">
        <form action="/search" className="flex h-[52px] items-center gap-2.5 rounded-2xl border-2 border-ink bg-white px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="2" aria-hidden="true">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
          </svg>
          <label className="flex-1">
            <span className="sr-only">Search</span>
            <input
              name="q"
              type="search"
              enterKeyHint="search"
              defaultValue={f.q}
              placeholder="Tigernut, plumber, shortlet…"
              className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-[#8a93a5]"
            />
          </label>
          <input type="hidden" name="s" value={section} />
        </form>
        <SectionSwitch section={section} action="/search" q={f.q} />
      </div>
      <div className="px-4 pt-5 lg:px-0 lg:pt-0">
        <BrowseView section={section} area={area} f={f} action="/search" />
      </div>
      <TabBar active="Search" />
    </main>
  );
}
