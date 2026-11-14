import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { readFilters, toSection } from "@/lib/sections";
import TabBar from "@/components/tab-bar";
import Bell from "@/components/bell";
import BrowseView, { SectionSwitch } from "@/components/browse-view";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function greeting() {
  // Lagos time
  const h = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const PLACEHOLDER = { products: "Tigernut, small chops, fabric…", services: "Plumber, electrician, cleaner…", online: "CV coaching, baking class…" };

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const section = toSection(typeof params.s === "string" ? params.s : null);
  const f = readFilters(params);
  const area = user.area ?? "Ikeja";
  const unread = await unreadCount(user.id);
  const first = user.name.split(" ")[0];

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28 lg:max-w-[1280px] lg:px-6 lg:pb-14 lg:pt-7">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 lg:hidden">
        <Link href="/area" className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-bold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {area}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="sr-only">Change area</span>
        </Link>
        <span className="text-xl font-extrabold tracking-[-0.02em]">Vouchly</span>
        <Bell initial={unread} />
      </header>

      <section className="flex flex-col gap-4 px-4 pt-3 lg:hidden">
        <div>
          <p className="text-sm font-semibold text-muted">
            {greeting()}, {first}
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em]">What do you need today?</h1>
        </div>
        <form action="/search" className="flex h-[52px] items-center gap-2.5 rounded-2xl border border-line bg-white px-4 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label className="flex-1">
            <span className="sr-only">Search Vouchly</span>
            <input name="q" type="search" enterKeyHint="search" placeholder={PLACEHOLDER[section]} className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a93a5]" />
          </label>
          <input type="hidden" name="s" value={section} />
        </form>
        <SectionSwitch section={section} action="/home" />
      </section>

      {user.role !== "buyer" && !user.confirmed && (
        <div className="px-4 pt-4 lg:px-0 lg:pb-5 lg:pt-0">
          <Link href="/me" className="block rounded-[18px] bg-[#fdf0d5] px-4 py-3 text-[13px] leading-relaxed text-[#3a2a08]">
            <b>Almost there.</b> Your ward contact will confirm you soon. You can browse and order in the meantime.
          </Link>
        </div>
      )}

      <div className="px-4 pt-6 lg:px-0 lg:pt-0">
        <BrowseView section={section} area={area} f={f} action="/home" showShops />
      </div>
      <TabBar active="Home" />
    </main>
  );
}
