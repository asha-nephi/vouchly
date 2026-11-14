import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { publicFreshListings } from "@/lib/browse";
import { priceText } from "@/lib/listings";
import TilePhoto from "@/components/tile-photo";
import Seal from "@/components/seal";

export const dynamic = "force-dynamic";

// Invite links get their own preview, naming who sent it.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ code?: string }> }): Promise<Metadata> {
  const inviter = await inviterFor((await searchParams).code);
  const base: Metadata = { title: { absolute: "Vouchly: buy from people your ward can vouch for" }, alternates: { canonical: "/" } };
  if (!inviter) return base;
  const title = `${inviter.name.split(" ")[0]} invited you to Vouchly`;
  const description = "Buy food, book stays and hire services from confirmed members in Lagos. Your invite code is ready.";
  return { ...base, title: { absolute: title }, description, openGraph: { title, description }, twitter: { title, description } };
}

async function inviterFor(raw?: string) {
  const code = raw && /^[A-Za-z0-9]{4,12}$/.test(raw) ? raw.toUpperCase() : "";
  if (!code) return null;
  const [row] = await db.select({ name: users.name, ward: users.ward }).from(users).where(and(eq(users.inviteCode, code), inArray(users.role, ["member", "ward_contact", "admin"]), eq(users.confirmed, true))).limit(1);
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
      url: SITE,
      logo: `${SITE}/icons/icon-512.png`,
      description: "A marketplace where confirmed members in Lagos buy food, book stays and hire services from each other.",
      address: { "@type": "PostalAddress", streetAddress: "57 Seriki Aro Avenue", addressLocality: "Ikeja", addressRegion: "Lagos", postalCode: "100282", addressCountry: "NG" },
      areaServed: { "@type": "City", name: "Lagos" },
    },
    { "@type": "WebSite", "@id": `${SITE}/#site`, name: "Vouchly", url: SITE, inLanguage: "en-NG", publisher: { "@id": `${SITE}/#org` } },
  ],
};

const STEPS = [
  { title: "A member invites you", body: "Ask anyone already on Vouchly for their invite code, or open the link they send you." },
  { title: "Your ward contact confirms you", body: "Someone in your ward checks that you are who you say. You can browse while you wait." },
  { title: "Buy, book or open a shop", body: "Order from members near you, book a stay or a service, or start selling in about five minutes." },
];

const FAQ = [
  {
    q: "Who can join?",
    a: "Anyone can create a buyer account. To sell, members of The Church of Jesus Christ of Latter-day Saints in Lagos need an invite and confirmation from a contact in their ward or branch.",
  },
  { q: "I don't have an invite code", a: "You don't need one to buy. To become a seller, ask a friend in your ward who uses Vouchly to share their code." },
  {
    q: "Is Vouchly run by the Church?",
    a: "No. Vouchly is run independently by members. It is not an official product of The Church of Jesus Christ of Latter-day Saints, and ward and stake leaders don't handle orders or problems.",
  },
  { q: "Which areas does it cover?", a: "All of Lagos. Shops in your area show first, from Ikeja and Ogba to Lekki, Yaba, Surulere and Ikorodu." },
  { q: "Who sees my phone number?", a: "Only the member you order from, so they can reach you about your order. We use it to send your sign-in codes by SMS." },
  { q: "What if something goes wrong with an order?", a: "Tap “Report a problem” on your order within 48 hours of the delivery day. The seller is told at once, and Vouchly steps in if you can't sort it out together." },
];

function MarketPhoto() {
  return (
    <figure className="mx-auto w-full max-w-[500px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] shadow-[0_20px_50px_-12px_rgba(20,33,61,0.3)]">
        <Image
          src="/images/market-maker.jpg"
          alt="A market woman smiling at the Monday Market in Kakuri, Kaduna."
          fill
          priority
          sizes="(min-width: 768px) 42vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
        <div className="absolute inset-x-4 bottom-4 rounded-[20px] bg-white/95 p-4 shadow-lg">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">For local makers and buyers</p>
          <p className="mt-1 text-[17px] font-extrabold leading-snug text-ink">Food, stays, services and the people behind them.</p>
        </div>
      </div>
      <figcaption className="mt-2 text-[10px] leading-relaxed text-muted">
        Illustrative photo, cropped: “A smiling market woman at the Monday Market in Kakuri, Kaduna 01” by{" "}
        <a href="https://commons.wikimedia.org/wiki/File:A_smiling_market_woman_at_the_Monday_Market_in_Kakuri,_Kaduna_01.jpg" target="_blank" rel="noreferrer" className="underline">
          Kambai Akau
        </a>
        , licensed under{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline">
          CC BY-SA 4.0
        </a>
        .
      </figcaption>
    </figure>
  );
}

export default async function Landing({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await currentUser();
  if (user && !user.isGuest) redirect("/home");
  // Opened from a member's invite link: say who invited them.
  const [inviter, fresh] = await Promise.all([inviterFor((await searchParams).code), publicFreshListings(3)]);
  const joinHref = inviter ? `/join?code=${inviter.code}` : "/join";
  const cta = (dark = false, light = false) => (
    <Link
      href={joinHref}
      className={`inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-2xl px-5 text-base font-extrabold sm:w-auto sm:px-7 ${dark ? "bg-white text-ink" : light ? "border border-line bg-white text-ink" : "bg-ink text-white"}`}
    >
      Start selling
    </Link>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-ink">
          Vouchly
        </Link>
        <Link href="/login" className="flex h-10 items-center rounded-full bg-white px-4 text-sm font-bold shadow-[0_1px_3px_rgba(20,33,61,0.1)]">
          Log in
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-12 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pb-20 md:pt-12">
          <div className="flex flex-col gap-5">
            {inviter && (
              <p className="w-fit rounded-full bg-soft px-3.5 py-1.5 text-sm font-bold text-deep">
                {inviter.name.split(" ")[0]} from {inviter.ward} invited you
              </p>
            )}
            <h1 className="text-[clamp(2.5rem,7vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink">
              Good businesses deserve to be found.
            </h1>
            <p className="max-w-[34rem] text-lg leading-relaxed text-[#3a4458]">
              Find food, stays and services from local member-owned shops. Have something good to sell? Open a shop and reach buyers across Lagos.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Link href="/register" className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-ink px-5 text-base font-extrabold text-white sm:w-auto sm:px-7">
                Create a buyer account
              </Link>
              {cta(false, true)}
            </div>
            <p className="text-sm text-muted">Buyer accounts are free. Selling needs a member invite.</p>
          </div>
          <MarketPhoto />
        </section>

        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">
              {fresh.length ? "Open shops in Lagos" : "A marketplace for local business"}
            </p>
            <h2 className="mt-2 max-w-xl text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">
              {fresh.length ? "Take a look around." : "Be part of what comes next."}
            </h2>
            {fresh.length ? (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                {fresh.map(({ product, shopName, confirmed }, i) => (
                  <Link key={product.id} href={`/p/${product.id}`} className="block min-w-0">
                    <span className="shimmer relative block aspect-square overflow-hidden rounded-[20px]">
                      <TilePhoto src={product.photos[0]} name={product.name} sizes="(min-width: 768px) 30vw, 50vw" priority={i < 2} />
                    </span>
                    <span className="mt-3 block truncate text-[15px] font-bold text-ink">{product.name}</span>
                    <span className="mt-0.5 block text-[15px] font-extrabold text-ink">{priceText(product)}</span>
                    <span className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-muted">
                      {confirmed && <Seal size={14} />}
                      <span className="truncate">{shopName}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-line bg-bg p-6 md:p-8">
                <h3 className="text-lg font-extrabold text-ink">Ready to open the first shop?</h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#3a4458]">
                  Sellers join with a member invite. Buyers can create a free account and shop as new listings arrive.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {cta()}
                  <Link href="/register" className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-2xl border border-line bg-white px-5 text-base font-extrabold text-ink sm:w-auto sm:px-7">
                    Create a buyer account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How joining works: a real sequence, so it's numbered. */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="max-w-xl text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">Every seller is known by someone</h2>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-[#3a4458]">
            Sellers join through a member and are confirmed in their own ward before they can open a shop. Buyers can create an account or shop as a guest.
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 md:flex-col">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-extrabold text-white">{i + 1}</span>
                <span>
                  <span className="block text-lg font-extrabold text-ink">{s.title}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-[#3a4458]">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Questions */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">Questions</h2>
            <div className="mt-6 divide-y divide-[#e6e9ef]">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold text-ink">
                    {f.q}
                    <span className="text-2xl font-normal text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#3a4458]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Last call */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="flex flex-col items-start gap-5 rounded-[32px] bg-accent p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight">Bring your business to Vouchly.</h2>
              <p className="mt-2 max-w-md text-[17px] text-[#dce4fb]">Set up a shop for what you make or do. Sellers need an invite from a member.</p>
            </div>
            {cta(true)}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted md:flex-row md:justify-between">
          <div>
            <p className="font-extrabold text-ink">Vouchly</p>
            <p className="mt-1">57 Seriki Aro Avenue, Ikeja, Lagos, Nigeria 100282</p>
            <p className="mt-1 max-w-md">Run independently by members. Not an official product of The Church of Jesus Christ of Latter-day Saints.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 font-bold text-ink">
            <Link href="/login">Log in</Link>
            <Link href="/register">Buyer account</Link>
            <Link href={joinHref}>Member invite</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
