import type { Metadata } from "next";
import Link from "next/link";
import Seal from "@/components/seal";
import { FAQ } from "@/lib/seo-copy";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";
const TITLE = "About Vouchly: the LDS marketplace for Latter-day Saint entrepreneurs";
const DESCRIPTION =
  "Vouchly is an online marketplace and business directory for LDS entrepreneurs, returned missionaries and the Latter-day Saint community in Lagos, Nigeria.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about", type: "website" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

// Tells search engines what this page is.
const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "AboutPage", "@id": `${SITE}/about#page`, url: `${SITE}/about`, name: TITLE, description: DESCRIPTION, about: { "@id": `${SITE}/#org` }, inLanguage: "en-NG" },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Vouchly", item: SITE },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about` },
      ],
    },
  ],
};

const SELLERS = [
  { title: "Service pros", body: "Plumbers, electricians, AC repair, cleaners, chefs, tailors, hair and beauty, and tutors. Get booked, send prices for bigger jobs, and build your name with reviews." },
  { title: "Online sellers", body: "Coaches, teachers, writers and designers. Sell downloads, 1-on-1 sessions people book by time slot, and classes or events with tickets." },
  { title: "Product sellers", body: "Food and drink makers, fashion, crafts, home goods, shortlets and physical stores. Take pre-orders, set delivery days, and offer pickup, drop-off or a rider." },
];

export default function About() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3.5 lg:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-[-0.02em] lg:text-[22px]">
            Vouchly
          </Link>
          <Link href="/join" className="flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-extrabold text-white">
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pb-16 pt-8 lg:px-6 lg:pt-14">
        <nav aria-label="Breadcrumb" className="mb-4 text-[13px] font-bold text-muted">
          <Link href="/" className="hover:text-ink">
            Vouchly
          </Link>{" "}
          / <span className="text-ink">About</span>
        </nav>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-soft py-1.5 pl-2 pr-3 text-[13px] font-extrabold text-deep">
          <Seal size={18} />
          Every seller is vouched for by their ward
        </p>
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[44px]">
          The marketplace for LDS entrepreneurs in Lagos
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#3A4458]">
          Vouchly is an online marketplace and business directory for the Latter-day Saint community in Lagos, Nigeria. It helps
          members become more self-reliant by selling what they make and the skills they have, to each other and to anyone they
          share a link with.
        </p>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Why Vouchly exists</h2>
          <p className="mt-3 text-base leading-relaxed text-[#3A4458]">
            Many members run small businesses: food, fashion, repairs, catering, tutoring. Many returned missionaries come home with
            real skills but struggle to find customers. Buyers, on the other hand, want someone they can trust in their home or
            with their money. Vouchly brings the two together, with trust built in.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Who sells on Vouchly</h2>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
            {SELLERS.map((s) => (
              <div key={s.title} className="rounded-[18px] border border-line bg-white p-5">
                <h3 className="text-lg font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3A4458]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">For returned missionaries</h2>
          <p className="mt-3 text-base leading-relaxed text-[#3A4458]">
            If you learned a trade, a language, design, coaching or any other skill, Vouchly gives you a shop page in minutes, a
            booking calendar or time slots, and a link to share on WhatsApp and Instagram. AI help can write your listing and your
            posts for you, so you can focus on the work.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">How “vouched for” works</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {[
              ["Invited by a member", "A member who already uses Vouchly shares an invite link."],
              ["Confirmed by their ward", "A contact in the seller’s own ward checks they are who they say they are."],
              ["Paid safely", "Buyers pay through Paystack. Problems can be reported within 48 hours."],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-extrabold text-white">{i + 1}</span>
                <span>
                  <b className="block text-[17px]">{t}</b>
                  <span className="text-[15px] text-muted">{b}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Questions people ask</h2>
          <div className="mt-4 flex flex-col gap-3">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-[18px] border border-line bg-white p-5">
                <h3 className="text-base font-extrabold">{f.q}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#3A4458]">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/home" className="flex h-[52px] items-center rounded-[14px] bg-ink px-6 text-base font-extrabold text-white">
            Start shopping
          </Link>
          <Link href="/join" className="flex h-[52px] items-center rounded-[14px] border border-[#D5DAE3] bg-white px-6 text-base font-extrabold">
            Start selling
          </Link>
        </div>

        <p className="mt-12 text-[13px] leading-relaxed text-muted">
          Vouchly, 57 Seriki Aro Avenue, Ikeja, Lagos 100282. Run independently by members. Not run by or affiliated with The Church of
          Jesus Christ of Latter-day Saints.
        </p>
      </main>
    </div>
  );
}
