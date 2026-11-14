import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { aiReady } from "@/lib/ai";
import { DAY_MS, runAi, whoIs } from "@/lib/ai-use";
import { looksLikeSentence, searchKey, sentenceToFilters } from "@/lib/ai-search";
import { readFilters, toSection } from "@/lib/sections";
import TabBar from "@/components/tab-bar";
import BrowseView, { SectionSwitch } from "@/components/browse-view";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Anyone can search; a member's own area is used when none is picked.
  const user = await currentUser();
  const params = await searchParams;
  // Old links used ?kind=class|digital; they now live in Online.
  const oldKind = params.kind === "class" || params.kind === "digital" ? params.kind : null;
  const section = oldKind ? "online" : toSection(typeof params.s === "string" ? params.s : null);
  const f = readFilters(oldKind ? { ...params, type: oldKind === "digital" ? "digital" : "event" } : params);
  const area = f.area ?? (user && !user.isGuest ? user.area : null) ?? "Ikeja";

  // Smart search: a sentence becomes real filters. Any failure falls back to plain search, quietly.
  if (f.q && !f.ai && aiReady() && looksLikeSentence(f.q)) {
    const res = await runAi({
      who: await whoIs(user?.id),
      feature: "search",
      cacheKey: `search:${section}:${searchKey(f.q)}`,
      cacheMs: DAY_MS,
      call: () => sentenceToFilters(f.q, section),
    });
    if (res.ok) redirect(`/search?${new URLSearchParams(res.value)}`);
  }

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
          {f.area && <input type="hidden" name="area" value={f.area} />}
        </form>
        <SectionSwitch section={section} action="/search" q={f.q} area={f.area} />
      </div>
      <div className="px-4 pt-5 lg:px-0 lg:pt-0">
        <BrowseView section={section} area={area} f={f} action="/search" />
      </div>
      <TabBar active="Search" />
    </main>
  );
}
