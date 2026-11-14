import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { browse, freshListings, upcomingClasses } from "@/lib/browse";
import { CATEGORIES, naira } from "@/lib/catalog";
import { priceText, tileTag } from "@/lib/listings";
import { nextDeliveryDay } from "@/lib/orders";
import { ticketsTaken } from "@/lib/sessions";
import { ShopRow } from "@/components/shop-card";
import Seal from "@/components/seal";
import TabBar from "@/components/tab-bar";
import Bell from "@/components/bell";
import TilePhoto from "@/components/tile-photo";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function greeting() {
  // Lagos time
  const h = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const day = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { ...opts, timeZone: "Africa/Lagos" }).format(d);

export default async function Home() {
  const user = await requireUser();
  const area = user.area ?? "Ikeja";
  const [{ near, more }, unread, fresh, classes] = await Promise.all([browse(area), unreadCount(user.id), freshListings(area, 6), upcomingClasses(8)]);
  const first = user.name.split(" ")[0];
  const seats = await Promise.all(classes.map((c) => (c.product.kind === "event" && c.product.seats ? ticketsTaken(c.product.id).then((n) => c.product.seats! - n) : null)));

  // Category chips, with Classes and Downloads (by what is sold) after Repairs.
  const chips = [
    { href: "/search", label: "All", on: true },
    ...CATEGORIES.slice(0, 3).map((c) => ({ href: `/c/${c.id}`, label: c.label.replace(" & drinks", ""), on: false })),
    { href: "/search?kind=class", label: "Classes", on: false },
    { href: "/search?kind=digital", label: "Downloads", on: false },
    ...CATEGORIES.slice(3).map((c) => ({ href: `/c/${c.id}`, label: c.label.replace(" & digital", ""), on: false })),
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
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

      <section className="px-4 pt-3">
        <p className="text-sm font-semibold text-muted">
          {greeting()}, {first}
        </p>
        <h1 className="mb-4 mt-1 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em]">What do you need today?</h1>
        {user.role !== "buyer" && !user.confirmed && (
          <Link href="/me" className="mb-4 block rounded-[18px] bg-[#fdf0d5] px-4 py-3 text-[13px] leading-relaxed text-[#3a2a08]">
            <b>Almost there.</b> Your ward contact will confirm you soon. You can browse and order in the meantime.
          </Link>
        )}
        <form action="/search" className="flex h-[52px] items-center gap-2.5 rounded-2xl border border-line bg-white px-4 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label className="flex-1">
            <span className="sr-only">Search Vouchly</span>
            <input name="q" type="search" enterKeyHint="search" placeholder="Tigernut, plumber, CV coaching…" className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a93a5]" />
          </label>
        </form>
      </section>

      <nav aria-label="Categories" className="hide-scroll flex gap-2 overflow-x-auto px-4 pb-1 pt-4">
        {chips.map((c) => (
          <Link key={c.label} href={c.href} aria-current={c.on ? "page" : undefined} className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${c.on ? "bg-ink font-bold text-white" : "border border-line bg-white font-semibold"}`}>
            {c.label}
          </Link>
        ))}
      </nav>

      {fresh.length > 0 && (
        <section className="px-4 pt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[19px] font-extrabold">Fresh this week</h2>
            <Link href="/search" className="text-sm font-bold text-accent">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fresh.map(({ product: p, shopName, confirmed, deliveryDays, cutoff }, i) => {
              const next = p.kind === "item" && deliveryDays ? nextDeliveryDay(deliveryDays, cutoff ?? "thu 18:00", new Date(), p.sellMode === "in_stock") : null;
              const tag = tileTag(p, next ? day(next, { weekday: "short" }) : undefined);
              return (
                <Link key={p.id} href={`/p/${p.id}`} className="block">
                  <span className="shimmer relative block aspect-square overflow-hidden rounded-[18px]">
                    <TilePhoto src={p.photos[0]} name={p.name} sizes="(min-width: 768px) 22rem, 50vw" priority={i < 2} />
                    {tag && <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold">{tag}</span>}
                  </span>
                  <span className="mb-0.5 mt-2.5 block text-[15px] font-bold leading-tight">{p.name}</span>
                  <span className={`mb-1 block text-[15px] font-extrabold tabular-nums ${p.priceKobo === 0 && (p.kind === "digital" || p.kind === "event") ? "text-[#1D7A46]" : ""}`}>
                    {priceText(p).replace("Price after a chat", "Ask for a price")}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                    {confirmed && <Seal size={14} />}
                    <span className="truncate">{shopName}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {classes.length > 0 && (
        <section className="pt-7">
          <div className="mx-4 mb-3 flex items-baseline justify-between">
            <h2 className="text-[19px] font-extrabold">Classes and coaching</h2>
            <Link href="/search?kind=class" className="text-sm font-bold text-accent">
              See all
            </Link>
          </div>
          <div className="hide-scroll flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {classes.map(({ product: p, shopName }, i) => {
              const left = seats[i];
              const isEvent = p.kind === "event" && p.eventAt;
              return (
                <Link key={p.id} href={`/p/${p.id}`} className="flex w-[270px] shrink-0 snap-start gap-3 rounded-[18px] border border-line bg-white p-3">
                  <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-soft" aria-hidden="true">
                    {isEvent ? (
                      <>
                        <span className="text-[11px] font-extrabold uppercase text-deep">{day(p.eventAt!, { weekday: "short" })}</span>
                        <span className="text-[22px] font-extrabold leading-none">{day(p.eventAt!, { day: "numeric" })}</span>
                      </>
                    ) : (
                      <span className="text-center text-[11px] font-extrabold leading-tight text-deep">
                        1-on-1
                        <br />
                        {p.durationMins ? `${p.durationMins} min` : "session"}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-tight">{p.name}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-muted">
                      {[isEvent ? day(p.eventAt!, { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(" ", "").toLowerCase() : null, p.online ? "Online" : "In person", p.priceKobo === 0 ? "Free" : naira(p.priceKobo)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-muted">{shopName}</span>
                    {isEvent && left !== null && <span className="mt-0.5 block text-xs font-extrabold text-[#B4540A]">{left <= 0 ? "Sold out" : left === 1 ? "1 seat left" : `${left} seats left`}</span>}
                    {!isEvent && <span className="mt-0.5 block text-xs font-extrabold text-[#B4540A]">Pick a time</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-4 pt-7">
        <h2 className="mb-3 text-[19px] font-extrabold">Shops near you</h2>
        {near.length === 0 ? (
          <div className="rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-5 text-center">
            <p className="text-[15px] font-bold">No shops in {area} yet</p>
            <p className="mt-1 text-[13px] text-muted">{more.length ? "Here's what members elsewhere in Lagos offer, below." : user.role === "buyer" ? "New shops are added often. Check back soon." : "Know a member who sells? Invite them from the Me tab."}</p>
          </div>
        ) : (
          <div className="cards">
            {near.map((s) => (
              <ShopRow key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {more.length > 0 && (
        <section className="px-4 pt-7">
          <h2 className="mb-3 text-[15px] font-bold text-muted">More in Lagos</h2>
          <div className="cards">
            {more.slice(0, 10).map((s) => (
              <ShopRow key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}
      <TabBar active="Home" />
    </main>
  );
}
