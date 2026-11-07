import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";

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
  const [row] = await db.select({ name: users.name, ward: users.ward }).from(users).where(eq(users.inviteCode, code)).limit(1);
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

const EXAMPLES = [
  {
    title: "Food and drinks",
    bg: "bg-[#f3e2b8]",
    icon: "M6 3h12l-1.5 18h-9zM6.5 8h11",
    lines: ["Tigernut and dates, 1 litre, for Saturday", "Small chops trays for a baby blessing", "Zobo with ginger, delivered in your area"],
  },
  {
    title: "Stays",
    bg: "bg-[#cfe3d8]",
    icon: "M3 11l9-7 9 7M5 10v10h14V10",
    lines: ["A 2-bed shortlet in Ikeja for stake conference weekend", "A quiet room near the airport for visiting family", "Pick dates on a calendar and pay to book"],
  },
  {
    title: "Services",
    bg: "bg-soft",
    icon: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
    lines: ["A plumber for a leaking sink by Tuesday", "AC servicing at a fixed price", "Carpentry, cleaning, makeup and more"],
  },
];

const STEPS = [
  { title: "A member invites you", body: "Ask anyone already on Vouchly for their invite code, or open the link they send you." },
  { title: "Your ward contact confirms you", body: "Someone in your ward checks that you are who you say. You can browse while you wait." },
  { title: "Buy, book or open a shop", body: "Order from members near you, book a stay or a service, or start selling in about five minutes." },
];

const FAQ = [
  {
    q: "Who can join?",
    a: "Members of The Church of Jesus Christ of Latter-day Saints in Lagos, invited by someone already on Vouchly and confirmed by a contact in their ward or branch.",
  },
  { q: "I don't have an invite code", a: "Ask a friend in your ward who uses Vouchly. Their code is on their Me page, and they can send you a link with it filled in." },
  {
    q: "Is Vouchly run by the Church?",
    a: "No. Vouchly is run independently by members. It is not an official product of The Church of Jesus Christ of Latter-day Saints, and ward and stake leaders don't handle orders or problems.",
  },
  { q: "Which areas does it cover?", a: "All of Lagos. Shops in your area show first, from Ikeja and Ogba to Lekki, Yaba, Surulere and Ikorodu." },
  { q: "Who sees my phone number?", a: "Only the member you order from, so they can reach you about your order. We use it to send your sign-in codes by SMS." },
  { q: "What if something goes wrong with an order?", a: "Tap “Report a problem” on your order within 48 hours of the delivery day. The seller is told at once, and Vouchly steps in if you can't sort it out together." },
];

// The hero picture: an example shop card that gets vouched for.
function VouchCard() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none" aria-hidden="true">
      <div className="absolute -right-3 top-6 h-[260px] w-[86%] rotate-[5deg] rounded-[28px] bg-[#cfe3d8]" />
      <div className="absolute -left-3 top-10 h-[250px] w-[86%] -rotate-[6deg] rounded-[28px] bg-[#f5d6cc]" />
      <div className="relative rounded-[28px] bg-white p-4 shadow-[0_20px_50px_-12px_rgba(20,33,61,0.45)]">
        <div className="flex h-[150px] items-center justify-center rounded-[20px] bg-[#f3e2b8]">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M6 3h12l-1.5 18h-9zM6.5 8h11" />
          </svg>
        </div>
        <p className="mt-3.5 text-[17px] font-extrabold text-ink">Tigernut and dates</p>
        <p className="text-sm text-muted">1 litre, ready for Saturday</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-ink">₦3,000</span>
          <span className="rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white">Add</span>
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[16px] bg-soft px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span className="text-[13px] leading-snug text-deep">
            <b>Made by a member</b> in Ikeja Ward
            <br />
            Confirmed by her ward contact
          </span>
        </div>
      </div>
      {/* The one animated moment: the stamp lands on the card. */}
      <div className="vouch-stamp absolute -right-2 -top-5 flex size-[104px] rotate-[-12deg] flex-col items-center justify-center rounded-full border-[3px] border-accent bg-white text-accent shadow-[0_8px_20px_-6px_rgba(42,75,215,0.5)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <span className="text-[15px] font-extrabold tracking-tight">Vouched</span>
      </div>
    </div>
  );
}

export default async function Landing({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await currentUser()) redirect("/home");
  // Opened from a member's invite link: say who invited them.
  const inviter = await inviterFor((await searchParams).code);
  const joinHref = inviter ? `/join?code=${inviter.code}` : "/join";
  const cta = (dark = false) => (
    <Link
      href={joinHref}
      className={`inline-flex h-14 items-center justify-center rounded-2xl px-7 text-base font-extrabold ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}
    >
      Create your account
    </Link>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Vouchly home">
          <Logo />
        </Link>
        <Link href="/login" className="flex h-10 items-center rounded-full bg-white px-4 text-sm font-bold shadow-[0_1px_3px_rgba(20,33,61,0.1)]">
          Log in
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-12">
          <div className="flex flex-col gap-5">
            {inviter && (
              <p className="w-fit rounded-full bg-soft px-3.5 py-1.5 text-sm font-bold text-deep">
                {inviter.name.split(" ")[0]} from {inviter.ward} invited you
              </p>
            )}
            <h1 className="text-[clamp(2.5rem,7vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink">
              Buy from people your ward can vouch for.
            </h1>
            <p className="max-w-[34rem] text-lg leading-relaxed text-[#3a4458]">
              Tigernut for Saturday, a shortlet for the weekend, a plumber by Tuesday. All from confirmed members in Lagos, paid safely through Paystack.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              {cta()}
              <span className="text-sm text-muted">{inviter ? "Your invite code is already filled in." : "Free to join with an invite code from a member."}</span>
            </div>
          </div>
          <VouchCard />
        </section>

        {/* What's on it */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-xl text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">What members are selling</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {EXAMPLES.map((e) => (
                <div key={e.title} className="rounded-[24px] bg-bg p-5">
                  <span className={`flex size-12 items-center justify-center rounded-2xl ${e.bg}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                      <path d={e.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold text-ink">{e.title}</h3>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[15px] leading-snug text-[#3a4458]">
                    {e.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How joining works: a real sequence, so it's numbered. */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="max-w-xl text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">Everyone here is known by someone</h2>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-[#3a4458]">
            There are no strangers on Vouchly. Each person joins through a member and is confirmed in their own ward before they can sell.
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

        {/* Paying and selling */}
        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2 md:pb-20">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_1px_3px_rgba(20,33,61,0.08)] md:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Pay without worrying</h2>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#3a4458]">
              <li>Pay by card or bank transfer through Paystack. You never send money to a stranger&apos;s account.</li>
              <li>Follow every order from paid to delivered, and call or WhatsApp the seller in one tap.</li>
              <li>Something wrong? Report it within 48 hours and get help sorting it out.</li>
              <li>Read reviews left only by members who actually bought.</li>
            </ul>
          </div>
          <div className="rounded-[28px] bg-ink p-6 text-white md:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Sell to people who already trust you</h2>
            <p className="mt-3 text-[clamp(1.5rem,3.5vw,2rem)] font-extrabold leading-tight text-[#afc0ff]">You keep 95% of every sale.</p>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#c9d1e3]">
              <li>No listing fees and no monthly fees. Vouchly takes 5% of items sold, and delivery fees are all yours.</li>
              <li>Paystack pays straight into your bank account.</li>
              <li>Take pre-orders for your delivery day, rent out a stay by the night, or send quotes for your services.</li>
              <li>Set up your shop in about five minutes, right from your phone.</li>
            </ul>
          </div>
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
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight">Shop with people you know.</h2>
              <p className="mt-2 max-w-md text-[17px] text-[#dce4fb]">Ask a member for their invite code and join in about two minutes.</p>
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
          <nav aria-label="Footer" className="flex gap-5 font-bold text-ink">
            <Link href="/login">Log in</Link>
            <Link href={joinHref}>Create account</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
