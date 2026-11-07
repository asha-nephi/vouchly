import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { browse } from "@/lib/browse";
import { CATEGORIES } from "@/lib/catalog";
import { CATEGORY_ICONS } from "@/lib/icons";
import { ShopRow, ShopTile } from "@/components/shop-card";
import TabBar from "@/components/tab-bar";

export const dynamic = "force-dynamic";

function greeting() {
  // Lagos time
  const h = Number(
    new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(new Date()),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home() {
  const user = await requireUser();
  const area = user.area ?? "Ikeja";
  const { near, more } = await browse(area);
  const first = user.name.split(" ")[0];
  const cats = [{ id: "all", label: "All" }, ...CATEGORIES].slice(0, 8);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            href="/area"
            className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-bold shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2a4bd7"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </svg>
            {area}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a6478"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className="sr-only">Change area</span>
          </Link>
          <span className="text-[15px] font-extrabold text-accent">
            Vouchly
          </span>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">
            {greeting()}, {first}
          </p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">
            What do you need today?
          </h1>
        </div>

        {!user.confirmed && (
          <Link
            href="/me"
            className="rounded-[18px] bg-[#fdf0d5] px-4 py-3 text-[13px] leading-relaxed text-[#3a2a08]"
          >
            <b>Almost there.</b> Your ward contact will confirm you soon. You
            can browse and order in the meantime.
          </Link>
        )}

        <Link
          href="/search"
          className="flex h-[52px] items-center gap-2.5 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5a6478"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
          </svg>
          <span className="text-[15px] text-[#8a93a5]">
            Tigernut, plumber, shortlet…
          </span>
        </Link>

        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5 md:grid-cols-8">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={c.id === "all" ? "/search" : `/c/${c.id}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`flex size-14 items-center justify-center rounded-[18px] ${c.id === "all" ? "bg-ink" : "bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]"}`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={c.id === "all" ? "#fff" : "#14213d"}
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={CATEGORY_ICONS[c.id]} />
                </svg>
              </span>
              <span className="text-center text-xs font-semibold text-muted">
                {c.label.replace(" & drinks", "")}
              </span>
            </Link>
          ))}
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-extrabold">Near you in {area}</h2>
            {near.length > 3 && (
              <Link
                href="/search"
                className="text-[13px] font-bold text-accent"
              >
                See all
              </Link>
            )}
          </div>
          {near.length === 0 ? (
            <div className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-5 text-center">
              <p className="text-[15px] font-bold">No shops in {area} yet</p>
              <p className="mt-1 text-[13px] text-muted">
                {more.length
                  ? "Here's what members elsewhere in Lagos offer."
                  : "Know a member who sells? Invite them from the Me tab."}
              </p>
            </div>
          ) : near.length <= 2 ? (
            <div className="cards">
              {near.map((s) => (
                <ShopRow key={s.id} s={s} />
              ))}
            </div>
          ) : (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {near.map((s) => (
                <ShopTile key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>

        {more.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-muted">More in Lagos</h2>
            <div className="cards">
              {more.slice(0, 10).map((s) => (
                <ShopRow key={s.id} s={s} />
              ))}
            </div>
          </section>
        )}
      </div>
      <TabBar active="Home" />
    </main>
  );
}
