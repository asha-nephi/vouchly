import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { landingPicks } from "@/lib/browse";
import { AREAS, naira } from "@/lib/catalog";
import { priceText } from "@/lib/listings";
import { freeDays, SECTIONS, SECTION_IDS } from "@/lib/sections";
import { ticketsTaken } from "@/lib/sessions";
import { initials, toneFor } from "@/lib/initials";
import TilePhoto from "@/components/tile-photo";
import Seal from "@/components/seal";
import { FAQ, faqJsonLd } from "@/lib/seo-copy";

export const dynamic = "force-dynamic";

// Invite links get their own preview, naming who sent it.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ code?: string }> }): Promise<Metadata> {
  const inviter = await inviterFor((await searchParams).code);
  const base: Metadata = { title: { absolute: "Vouchly: Buy from People You Can Trust in Lagos" }, alternates: { canonical: "/" } };
  if (!inviter) return base;
  const title = `${inviter.name.split(" ")[0]} invited you to Vouchly`;
  const description = "Buy food, book stays and hire services from confirmed members in Lagos. Your invite code is ready.";
  return { ...base, title: { absolute: title }, description, openGraph: { title, description }, twitter: { title, description } };
}

async function inviterFor(raw?: string) {
  const code = raw && /^[A-Za-z0-9]{4,12}$/.test(raw) ? raw.toUpperCase() : "";
  if (!code) return null;
  const [row] = await db.select({ name: users.name, ward: users.ward }).from(users).where(and(eq(users.inviteCode, code), inArray(users.role, ["member", "ward_contact", "admin"]), eq(users.confirmed, true), isNull(users.suspendedAt))).limit(1);
  return row ? { ...row, code } : null;
}

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

// Tells search engines who runs the site.
const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "Vouchly",
      alternateName: ["Vouchly LDS Marketplace", "Vouchly Nigeria"],
      url: SITE,
      logo: `${SITE}/icons/icon-512.png`,
      slogan: "Buy from people you can trust.",
      description: "Vouchly is an online marketplace in Lagos, Nigeria, where every seller is vouched for. Started by Latter-day Saint (LDS) entrepreneurs and open to every buyer: food and goods, services and classes to anyone.",
      knowsAbout: ["LDS entrepreneurs", "Latter-day Saint businesses", "Lagos marketplace", "returned missionary businesses"],
      address: { "@type": "PostalAddress", streetAddress: "57 Seriki Aro Avenue", addressLocality: "Ikeja", addressRegion: "Lagos", postalCode: "100282", addressCountry: "NG" },
      areaServed: { "@type": "City", name: "Lagos" },
    },
    { "@type": "WebSite", "@id": `${SITE}/#site`, name: "Vouchly", alternateName: "Vouchly LDS Marketplace", url: SITE, inLanguage: "en-NG", publisher: { "@id": `${SITE}/#org` } },
    faqJsonLd,
  ],
};

const ICONS = {
  products: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  ),
  services: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z" />
      <path d="M14.5 6.5L17 4l3 3-2.5 2.5" />
    </svg>
  ),
  online: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9.5v5l4.5-2.5z" fill="#fff" />
    </svg>
  ),
};

const DOORS = [
  { id: "products", bg: "#B5712F", body: "Food, drinks, fashion and things for the home. Pick up, get it dropped off or send a rider.", short: "Food, fashion, home goods. Pickup or delivery.", tags: ["Food", "Drinks", "Fashion", "Crafts", "Stays"], cta: "Browse products" },
  { id: "services", bg: "#4F6D7A", body: "Plumbers, electricians, cleaners, chefs and more. Book a visit or ask for a price first.", short: "Plumbers, electricians, cleaners, chefs.", tags: ["Plumbing", "Electrical", "AC repair", "Cleaning", "Chefs"], cta: "Find a pro" },
  { id: "online", bg: "#3F5BA9", body: "Downloads, 1-on-1 coaching and classes from members who know their stuff.", short: "Downloads, coaching and classes.", tags: ["Downloads", "Coaching", "Classes", "Events"], cta: "Browse online" },
] as const;

const EARN = [
  { title: "Offer a service", who: "Plumbers, electricians, cleaners, chefs, tailors", gets: ["A booking calendar with your working days", "Send prices for jobs that need a quote", "Reviews that build your name"], one: "Booking calendar, quotes and reviews." },
  { title: "Sell online", who: "Coaches, teachers, writers, designers", gets: ["Instant downloads, files kept private", "1-on-1 sessions people book by time slot", "Classes and events with tickets"], one: "Instant downloads, sessions and classes." },
  { title: "Sell products", who: "Food makers, fashion, crafts, store owners", gets: ["A shop page anyone can buy from", "Pre-orders and delivery days", "Pickup, drop-off or rider"], one: "A shop page, pre-orders and delivery days." },
];

const POPULAR = [
  { q: "Plumber", s: "services" },
  { q: "AC repair", s: "services" },
  { q: "Small chops", s: "products" },
  { q: "CV coaching", s: "online" },
];

const FACTS = [
  { title: "Every seller is confirmed", body: "A contact in their own ward checks who they are before they can sell.", short: "by a contact in their own ward." },
  { title: "Pay safely", body: "Card, transfer or USSD through Paystack. No sending money to strangers.", short: "through Paystack by card, transfer or USSD." },
  { title: "Help if it goes wrong", body: "Report a problem within 48 hours and we help you sort it out.", short: "Report a problem within 48 hours." },
];

const factIcon = (i: number, size: number) =>
  i === 0 ? (
    <Seal size={size} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2A4BD7" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
      {i === 1 ? (
        <>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5v.5" />
        </>
      )}
    </svg>
  );

const day = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { ...opts, timeZone: "Africa/Lagos" }).format(d);

export default async function Landing({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await currentUser();
  if (user && !user.isGuest) redirect("/home");
  // Opened from a member's invite link: say who invited them.
  const [inviter, picks] = await Promise.all([inviterFor((await searchParams).code), landingPicks()]);
  const sellHref = inviter ? `/join?code=${inviter.code}` : "/join";
  const signUpHref = sellHref;
  const { pro, goods, cls } = picks;
  const [free, seatsLeft] = await Promise.all([
    pro ? freeDays([{ id: pro.product.id, shopId: pro.product.shopId, workDays: pro.product.workDays }]).then((m) => m.get(pro.product.id) ?? null) : null,
    cls?.product.kind === "event" && cls.product.seats ? ticketsTaken(cls.product.id).then((n) => cls.product.seats! - n) : null,
  ]);
  const hold = process.env.PAYOUT_MODE === "hold";
  const steps = [
    { title: "Get an invite", body: "A member who already uses Vouchly shares their invite link with you.", short: "A member shares their invite link with you." },
    { title: "Your ward confirms you", body: "A contact in your ward checks you are who you say. You can set up while you wait.", short: "You can set up while you wait." },
    {
      title: "Share your link and get paid",
      body: hold ? "Anyone with your shop link can buy. Once the buyer has their order, the money goes to your bank." : "Anyone with your shop link can buy. Paystack sends the money to your bank, usually the next working day.",
      short: hold ? "The money goes to your bank once the order is done." : "Money reaches your bank, usually the next working day.",
    },
  ];
  const hasPicks = !!(pro || goods.length || cls);
  // With only products to show, fill the space with a grid of up to 4; otherwise 2 sit between the pro and the class.
  const onlyGoods = !pro && !cls;
  const shownGoods = onlyGoods ? goods : goods.slice(0, 2);

  return (
    <div className="min-h-dvh bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-x-7 gap-y-3 px-4 py-3.5 lg:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-[-0.02em] text-ink lg:text-[22px]">
            Vouchly
          </Link>
          <nav aria-label="Sections" className="hidden gap-[22px] text-[15px] font-bold lg:flex">
            {SECTION_IDS.map((s) => (
              <Link key={s} href={`/home?s=${s}`} className="text-ink hover:text-accent">
                {SECTIONS[s].door}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:gap-2.5">
            <Link href={sellHref} className="hidden px-2 text-[15px] font-bold text-accent lg:block">
              Sell on Vouchly
            </Link>
            <Link href="/login" className="flex h-11 items-center rounded-xl border border-[#D5DAE3] px-3.5 text-sm font-bold text-ink lg:px-4 lg:text-[15px]">
              Log in
            </Link>
            <Link href={signUpHref} className="flex h-11 items-center rounded-xl bg-ink px-3.5 text-sm font-extrabold text-white lg:px-[18px] lg:text-[15px]">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-4 pb-2 pt-7 lg:px-6 lg:pb-14 lg:pt-16">
          <div className="min-w-0 flex-[1_1_520px]">
            {inviter ? (
              <p className="mb-3 inline-flex rounded-full bg-soft px-3 py-1.5 text-[13px] font-extrabold text-deep">
                {inviter.name.split(" ")[0]} from {inviter.ward} invited you
              </p>
            ) : (
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-soft py-1.5 pl-2 pr-3 text-xs font-extrabold text-deep lg:mb-3.5 lg:text-[13px]">
                <Seal size={18} />
                <span>
                  Every seller is vouched for<span className="hidden lg:inline"> by their ward</span>
                </span>
              </p>
            )}
            <h1 className="max-w-[13ch] text-[36px] font-extrabold leading-[1.06] tracking-[-0.03em] lg:text-[clamp(40px,5vw,64px)] lg:leading-[1.04] lg:tracking-[-0.035em]">
              Buy from people you can trust.
            </h1>
            <p className="mb-5 mt-3 max-w-[46ch] text-base leading-relaxed text-[#3A4458] lg:mb-7 lg:mt-[18px] lg:text-lg">
              Food and goods, plumbers and electricians, classes and downloads. All from local sellers in Lagos who someone has vouched for.
            </p>

            <form action="/search" className="max-w-[640px] rounded-[18px] border border-line bg-white p-1.5 lg:rounded-[20px] lg:p-2 lg:shadow-[0_12px_32px_-16px_rgba(20,33,61,0.25)]">
              <fieldset className="grid grid-cols-3 gap-1 pb-1.5 lg:flex lg:p-1 lg:pb-2">
                <legend className="sr-only">What are you looking for?</legend>
                {SECTION_IDS.map((s, i) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="s" value={s} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="flex h-[38px] items-center justify-center rounded-[10px] px-3.5 text-sm font-bold text-muted peer-checked:bg-ink peer-checked:font-extrabold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent lg:h-9">
                      {SECTIONS[s].label}
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <label className="flex h-[52px] min-w-0 flex-[1_1_220px] items-center gap-2.5 rounded-xl bg-bg px-3.5 lg:h-[54px] lg:rounded-[14px]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <span className="sr-only">Search</span>
                  <input name="q" type="search" enterKeyHint="search" placeholder="Tigernut, small chops, fabric…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8a93a5]" />
                </label>
                <label className="hidden h-[54px] flex-[0_1_170px] items-center gap-2 rounded-[14px] bg-bg px-3.5 text-[15px] font-bold lg:flex">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  <span className="sr-only">Area</span>
                  <select name="area" defaultValue="Ikeja" className="min-w-0 flex-1 bg-transparent font-bold outline-none">
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="hidden h-[54px] items-center rounded-[14px] bg-accent px-[26px] text-base font-extrabold text-white lg:flex">
                  Search
                </button>
              </div>
            </form>
            <p className="mt-3.5 hidden flex-wrap items-center gap-2 text-[13px] font-bold text-muted lg:flex">
              Popular:
              {POPULAR.map((p) => (
                <Link key={p.q} href={`/search?s=${p.s}&q=${encodeURIComponent(p.q)}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-ink hover:border-accent">
                  {p.q}
                </Link>
              ))}
            </p>
          </div>

          {hasPicks && (
            <div aria-label="On Vouchly now" className="hidden min-w-0 max-w-[460px] flex-[1_1_380px] flex-col gap-3.5 lg:flex">
              {onlyGoods && <p className="text-sm font-extrabold text-muted">New on Vouchly</p>}
              {pro && (
                <Link href={`/p/${pro.product.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(20,33,61,0.3)]">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl font-extrabold text-white" style={{ background: toneFor(pro.shopName) }} aria-hidden="true">
                    {initials(pro.shopName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-base font-extrabold">
                      <span className="truncate">{pro.shopName}</span>
                      {pro.confirmed && <Seal size={16} />}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] font-semibold text-muted">
                      {[pro.product.name, pro.ward, pro.rating ? `★ ${pro.rating} (${pro.reviewCount})` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {free && <span className="shrink-0 rounded-full bg-[#E3F3EA] px-2.5 py-1.5 text-xs font-extrabold text-[#1D7A46]">{free.label}</span>}
                </Link>
              )}
              {shownGoods.length > 0 && (
                <div className={onlyGoods ? `grid gap-3.5 ${shownGoods.length > 1 ? "grid-cols-2" : ""}` : "ml-9 flex gap-3.5"}>
                  {shownGoods.map((g) => (
                    <Link
                      key={g.product.id}
                      href={`/p/${g.product.id}`}
                      className="min-w-0 flex-1 rounded-[20px] border border-line bg-white p-3 shadow-[0_10px_30px_-18px_rgba(20,33,61,0.3)] transition hover:-translate-y-0.5"
                    >
                      <span className="shimmer relative block aspect-[4/3] overflow-hidden rounded-[14px]">
                        <TilePhoto src={g.product.photos[0]} name={g.product.name} sizes="200px" />
                      </span>
                      <span className="mt-2.5 block truncate text-sm font-bold">{g.product.name}</span>
                      <span className="mt-0.5 block text-sm font-extrabold tabular-nums">{priceText(g.product)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {cls && (
                <Link href={`/p/${cls.product.id}`} className="flex items-center gap-3 rounded-[20px] bg-ink px-4 py-3.5 text-white">
                  <span className="flex h-[52px] w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10" aria-hidden="true">
                    {cls.product.kind === "event" && cls.product.eventAt ? (
                      <>
                        <span className="text-[10px] font-extrabold uppercase text-[#AFC0F5]">{day(cls.product.eventAt, { weekday: "short" })}</span>
                        <span className="text-xl font-extrabold leading-none">{day(cls.product.eventAt, { day: "numeric" })}</span>
                      </>
                    ) : (
                      <span className="text-center text-[10px] font-extrabold leading-tight text-[#AFC0F5]">1-on-1</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold">{cls.product.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-[#C9D3EE]">
                      {[cls.product.online ? "Online" : "In person", seatsLeft !== null && seatsLeft > 0 ? (seatsLeft === 1 ? "1 seat left" : `${seatsLeft} seats left`) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums">{cls.product.priceKobo ? naira(cls.product.priceKobo) : "Free"}</span>
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="lg:border-y lg:border-line lg:bg-white">
          <div className="mx-auto max-w-[1200px] px-4 pt-6 lg:px-6 lg:py-16">
            <h2 className="mb-3 text-xl font-extrabold lg:mb-1.5 lg:text-[32px] lg:tracking-[-0.02em]">What are you looking for?</h2>
            <p className="mb-7 hidden text-base text-muted lg:block">Three ways to shop. Pick one and we&apos;ll show you only what fits.</p>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-[18px]">
              {DOORS.map((d) => (
                <Link key={d.id} href={`/home?s=${d.id}`} className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4 text-ink lg:flex-col lg:items-start lg:gap-0 lg:rounded-[22px] lg:bg-bg lg:p-6">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[14px] lg:size-[52px] lg:rounded-2xl" style={{ background: d.bg }}>
                    {ICONS[d.id]}
                  </span>
                  <span className="min-w-0 flex-1 lg:flex lg:w-full lg:flex-col">
                    <span className="block text-[17px] font-extrabold lg:mb-1.5 lg:mt-[18px] lg:text-[22px]">{SECTIONS[d.id].door}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted lg:hidden">{d.short}</span>
                    <span className="mb-4 hidden text-[15px] leading-normal text-[#3A4458] lg:block">{d.body}</span>
                    <span className="mb-5 hidden flex-wrap gap-1.5 lg:flex">
                      {d.tags.map((t) => (
                        <span key={t} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-bold">
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="mt-auto hidden text-[15px] font-extrabold text-accent lg:block">{d.cta}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-7 lg:grid lg:grid-cols-3 lg:gap-6 lg:px-6 lg:py-12">
          {FACTS.map((f, i) => (
            <div key={f.title} className="flex gap-3 lg:gap-3.5">
              <span className="lg:hidden">{factIcon(i, 22)}</span>
              <span className="hidden lg:block">{factIcon(i, 28)}</span>
              <p className="text-sm leading-normal text-[#3A4458] lg:hidden">
                <b className="text-ink">{f.title}</b> {f.short}
              </p>
              <div className="hidden lg:block">
                <p className="text-base font-extrabold">{f.title}</p>
                <p className="mt-1 text-sm leading-normal text-muted">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 bg-ink text-white lg:mt-0">
          <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-6 lg:py-[72px]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-5 lg:mb-8">
              <div className="max-w-[560px]">
                <h2 className="mb-1.5 text-[26px] font-extrabold tracking-[-0.02em] lg:mb-2 lg:text-4xl">Make money on Vouchly</h2>
                <p className="text-[15px] leading-normal text-[#C9D3EE] lg:text-base">
                  Tell us what you do<span className="hidden lg:inline"> and we&apos;ll set you up with the right tools</span>. You keep 95% of every sale.
                </p>
              </div>
              <Link href={sellHref} className="hidden h-[52px] items-center rounded-[14px] bg-white px-6 text-base font-extrabold text-ink lg:flex">
                Start selling
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-[18px]">
              {EARN.map((e) => (
                <Link key={e.title} href={sellHref} className="block rounded-[18px] border border-white/12 bg-white/6 p-4 text-white lg:rounded-[22px] lg:p-6">
                  <span className="block text-[17px] font-extrabold lg:mb-1 lg:text-[21px]">{e.title}</span>
                  <span className="mt-0.5 block text-[13px] font-bold text-[#AFC0F5] lg:mb-4 lg:text-sm">{e.who}</span>
                  <span className="mt-2 block text-sm leading-snug text-[#E6EBFA] lg:hidden">{e.one}</span>
                  <ul className="hidden flex-col gap-2 lg:flex">
                    {e.gets.map((g) => (
                      <li key={g} className="flex gap-2.5 text-[15px] leading-snug text-[#E6EBFA]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7FA0FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        {g}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
            <Link href={sellHref} className="mt-[18px] flex h-[52px] items-center justify-center rounded-[14px] bg-white text-base font-extrabold text-ink lg:hidden">
              Start selling
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-6 lg:py-16">
          <h2 className="mb-4 text-xl font-extrabold lg:mb-6 lg:text-[28px] lg:tracking-[-0.02em]">How selling works</h2>
          <ol className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 lg:block">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-white lg:size-9 lg:text-base">{i + 1}</span>
                <span className="lg:block">
                  <b className="block text-[15px] lg:mb-1 lg:mt-3.5 lg:text-[17px] lg:font-extrabold">{s.title}</b>
                  <span className="text-sm text-muted lg:hidden">{s.short}</span>
                  <span className="hidden text-[15px] leading-normal text-muted lg:block">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="about-title" className="border-t border-line bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-6 lg:py-16">
            <div>
              <h2 id="about-title" className="text-xl font-extrabold lg:text-[28px] lg:tracking-[-0.02em]">
                Started by members, open to everyone
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3A4458] lg:text-base">
                Vouchly was started by Latter-day Saint entrepreneurs in Lagos to help people earn a living from what they know and
                make. Food makers, tailors, plumbers, electricians, chefs, coaches and returned missionaries with a skill open a shop,
                share one link, and get paid safely.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3A4458] lg:text-base">
                Every seller is confirmed by someone who knows them, so buyers know who they are dealing with. Anyone in Lagos can buy,
                and money goes through Paystack.
              </p>
              <Link href="/about" className="mt-4 inline-block text-[15px] font-extrabold text-accent">
                More about Vouchly
              </Link>
            </div>
            <div>
              <h2 className="text-lg font-extrabold lg:text-xl">Questions people ask</h2>
              <div className="mt-3 divide-y divide-line rounded-[18px] border border-line">
                {FAQ.map((f) => (
                  <details key={f.q} className="group px-4 py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold">
                      {f.q}
                      <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[#3A4458]">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-9 border-t border-line bg-white lg:mt-0">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 lg:flex-row lg:flex-wrap lg:justify-between lg:gap-x-10 lg:gap-y-5 lg:px-6 lg:py-8">
          <div className="max-w-[460px]">
            <p className="text-[17px] font-extrabold lg:text-lg">Vouchly</p>
            <p className="mt-1.5 hidden text-[13px] leading-relaxed text-muted lg:block">
              57 Seriki Aro Avenue, Ikeja, Lagos 100282. Run independently by members. Not run by or affiliated with The Church of Jesus Christ of Latter-day Saints.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2.5 text-sm font-bold lg:flex lg:flex-wrap lg:gap-x-7 lg:gap-y-3">
            {SECTION_IDS.map((s) => (
              <Link key={s} href={`/home?s=${s}`} className="py-1 text-ink">
                {SECTIONS[s].door}
              </Link>
            ))}
            <Link href={sellHref} className="py-1 text-ink">
              Sell on Vouchly
            </Link>
            <Link href="/about" className="py-1 text-ink">
              About
            </Link>
            <Link href="/contact" className="py-1 text-ink">
              Contact
            </Link>
          </nav>
          <p className="text-xs leading-relaxed text-muted lg:hidden">57 Seriki Aro Avenue, Ikeja, Lagos. Run independently by members. Not run by or affiliated with The Church of Jesus Christ of Latter-day Saints.</p>
        </div>
      </footer>
    </div>
  );
}
