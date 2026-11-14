import type { Metadata } from "next";
import { clip, shareMeta } from "@/lib/share-meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, reviews, shops, users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { categoryLabel, cutoffLabel, dayList, naira } from "@/lib/catalog";
import { BasketProvider, CheckoutBar, TileAdd } from "@/components/basket-controls";
import TabBar from "@/components/tab-bar";
import Photo from "@/components/photo";
import Seal from "@/components/seal";
import ShareButton from "@/components/share-button";
import TilePhoto from "@/components/tile-photo";
import { ctaLabel, priceText, tileTag } from "@/lib/listings";
import { nextDeliveryDay } from "@/lib/orders";
import { shopStats } from "@/lib/shop-stats";
import { initials, toneFor } from "@/lib/initials";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
  if (!shop) return { title: "Shop not found" };
  const [first] = await db
    .select({ photos: products.photos })
    .from(products)
    .where(and(eq(products.shopId, shop.id), eq(products.isActive, true), eq(products.removed, false)))
    .limit(1);
  return shareMeta({
    title: `${shop.name} on Vouchly`,
    description: clip(shop.about) || `${categoryLabel(shop.category)} in ${shop.area}, Lagos, from a confirmed member. Order and pay safely on Vouchly.`,
    path: `/s/${shop.slug}`,
    photo: shop.coverPhoto ?? first?.photos[0],
  });
}

// Filter chips: which kinds of listing each one shows.
const GROUPS = [
  { key: "item", label: "Products", kinds: ["item"] },
  { key: "stay", label: "Stays", kinds: ["stay"] },
  { key: "service", label: "Services", kinds: ["service"] },
  { key: "class", label: "Classes", kinds: ["session", "event"] },
  { key: "digital", label: "Downloads", kinds: ["digital"] },
] as const;

const sizes = "(min-width: 768px) 22rem, 50vw";

export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string }> }) {
  const me = await currentUser();
  const { slug } = await params;
  const { k } = await searchParams;
  const [row] = await db
    .select({ shop: shops, ward: users.ward, confirmed: users.confirmed })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(eq(shops.slug, slug))
    .limit(1);
  if (!row) notFound();
  const { shop, ward, confirmed } = row;
  const isMine = shop.ownerId === me?.id;

  const [items, [d], basket, shopReviews, stats] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.isActive, true), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    basketStart(),
    db
      .select({ review: reviews, name: users.name, ward: users.ward })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.shopId, shop.id))
      .orderBy(desc(reviews.createdAt))
      .limit(10),
    shopStats(shop.id),
  ]);
  const when = new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  const since = new Intl.DateTimeFormat("en-NG", { year: "numeric", timeZone: "Africa/Lagos" }).format(shop.createdAt);
  const canBuy = shop.isOpen && !isMine;

  const chips = GROUPS.map((g) => ({ ...g, n: items.filter((i) => (g.kinds as readonly string[]).includes(i.kind)).length })).filter((g) => g.n > 0);
  const active = chips.find((c) => c.key === k);
  const shown = active ? items.filter((i) => (active.kinds as readonly string[]).includes(i.kind)) : items;

  // Next delivery for ready-made and pre-order items.
  const hasItems = items.some((i) => i.kind === "item");
  const next = d && hasItems ? nextDeliveryDay(d.deliveryDays, d.orderCutoff, new Date(), items.filter((i) => i.kind === "item").every((i) => i.sellMode === "in_stock")) : null;
  const nextLabel = next ? new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(next) : null;
  const readyDay = next ? new Intl.DateTimeFormat("en-NG", { weekday: "short", timeZone: "Africa/Lagos" }).format(next) : undefined;
  const ways = d ? [d.pickupOn && "Pickup", d.dropOffOn && "drop-off", d.riderOn && "rider"].filter(Boolean).join(", ") : "";

  const statCells = [
    stats.rating !== null && { big: `★ ${stats.rating.toFixed(1)}`, small: `${stats.reviews} ${stats.reviews === 1 ? "review" : "reviews"}` },
    stats.orders > 0 && { big: String(stats.orders), small: "orders done" },
    { big: since, small: "selling since" },
  ].filter(Boolean) as { big: string; small: string }[];

  return (
    <BasketProvider initialQty={basket.qty} initialCount={basket.count} initialTotal={basket.totalKobo}>
      <main className="mx-auto min-h-dvh max-w-md pb-44">
        <div className="relative h-[168px] md:h-[240px]" style={{ background: shop.coverPhoto ? undefined : toneFor(shop.name) }}>
          {shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="(min-width: 1200px) 52rem, (min-width: 768px) 44rem, 100vw" priority />}
          <Link
            href={isMine ? "/shop/manage" : me && !me.isGuest ? "/home" : "/"}
            aria-label="Back"
            className="absolute left-3.5 top-3.5 flex size-11 items-center justify-center rounded-full bg-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <ShareButton title={shop.name} text={`${shop.name} on Vouchly`} path={`/s/${shop.slug}`} className="absolute right-3.5 top-3.5 flex size-11 items-center justify-center rounded-full bg-white" />
        </div>

        <section className="relative mx-4 -mt-11 rounded-[22px] border border-line bg-white px-[18px] pb-[18px]">
          <div className="-mt-[30px] flex items-end justify-between gap-2">
            <span
              className="grid size-[76px] shrink-0 place-items-center rounded-[22px] border-4 border-white text-2xl font-extrabold text-white"
              style={{ background: toneFor(shop.name) }}
              aria-hidden="true"
            >
              {initials(shop.name)}
            </span>
            {confirmed && (
              <span className="flex items-center gap-1.5 rounded-full bg-soft py-1.5 pl-2 pr-3 text-xs font-extrabold text-deep">
                <Seal size={18} />
                <span>Vouched by {ward}</span>
              </span>
            )}
          </div>
          <h1 className="mb-1 mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{shop.name}</h1>
          {shop.about && <p className="text-sm leading-relaxed text-muted">{shop.about}</p>}
          <div className="mt-4 grid border-t border-line pt-3.5" style={{ gridTemplateColumns: `repeat(${statCells.length}, minmax(0, 1fr))` }}>
            {statCells.map((c) => (
              <div key={c.small}>
                {c.small.includes("review") ? (
                  <a href="#reviews">
                    <p className="text-[17px] font-extrabold tabular-nums">{c.big}</p>
                    <p className="mt-0.5 text-xs font-semibold text-muted">{c.small}</p>
                  </a>
                ) : (
                  <>
                    <p className="text-[17px] font-extrabold tabular-nums">{c.big}</p>
                    <p className="mt-0.5 text-xs font-semibold text-muted">{c.small}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 px-4 pt-3">
          {isMine && <p className="rounded-[14px] bg-[#fdf0d5] px-4 py-3 text-[13px] font-semibold text-[#3a2a08]">This is how buyers see your shop.</p>}
          {!shop.isOpen && <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">This shop is closed for now.</p>}
          {d && nextLabel && (
            <section className="flex items-start gap-3 rounded-[18px] border border-line bg-white px-4 py-3.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2A4BD7" strokeWidth="2" strokeLinecap="round" className="mt-px shrink-0" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              <div>
                <p className="text-sm font-extrabold">Next delivery: {nextLabel}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  Order by {cutoffLabel(d.orderCutoff)}
                  {ways && ` · ${ways.charAt(0).toUpperCase()}${ways.slice(1)}`}
                </p>
              </div>
            </section>
          )}
        </div>

        {chips.length > 1 && (
          <nav aria-label="Filter listings" className="hide-scroll flex gap-2 overflow-x-auto px-4 pb-1 pt-5">
            {[{ key: "", label: "All", n: items.length }, ...chips].map((c) => {
              const on = (c.key || undefined) === active?.key;
              return (
                <Link
                  key={c.key}
                  href={c.key ? `/s/${shop.slug}?k=${c.key}` : `/s/${shop.slug}`}
                  replace
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={`flex h-11 shrink-0 items-center rounded-full px-3.5 text-[13px] ${on ? "bg-ink font-bold text-white" : "border border-line bg-white font-semibold text-ink"}`}
                >
                  {c.label} <span className={`ml-1 ${on ? "opacity-70" : "text-muted"}`}>{c.n}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <section className="px-4 pt-3.5">
          {items.length === 0 ? (
            <div className="rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-8 text-center">
              <p className="text-[15px] font-bold">Nothing for sale yet</p>
              <p className="mt-1 text-[13px] text-muted">{isMine ? "Add your first listing so buyers can order." : "Check back soon, or message the seller through a friend."}</p>
              {isMine && (
                <Link href="/shop/manage/products/new" className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
                  Add a listing
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
              {shown.map((p, i) => {
                const tag = tileTag(p, readyDay);
                return (
                  <div key={p.id}>
                    <Link href={`/p/${p.id}`} className="shimmer relative block aspect-square overflow-hidden rounded-[18px]">
                      <TilePhoto src={p.photos[0]} name={p.name} sizes={sizes} priority={i < 2} />
                      {tag && <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-ink">{tag}</span>}
                    </Link>
                    <Link href={`/p/${p.id}`} className="mb-0.5 mt-2.5 block text-[15px] font-bold leading-tight">
                      {p.name}
                    </Link>
                    <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
                      <p className={`text-[15px] font-extrabold tabular-nums ${p.priceKobo === 0 && (p.kind === "digital" || p.kind === "event") ? "text-[#1D7A46]" : ""}`}>
                        {p.kind === "stay" || p.kind === "session" ? naira(p.priceKobo) : priceText(p).replace("Price after a chat", "Ask for a price")}
                      </p>
                      {p.kind === "item" ? (
                        canBuy && <TileAdd productId={p.id} name={p.name} />
                      ) : (
                        <Link href={`/p/${p.id}`} className="relative flex h-[34px] items-center rounded-full bg-soft px-3.5 text-[13px] font-extrabold text-deep after:absolute after:-inset-1.5 after:content-['']">
                          {ctaLabel(p)}
                        </Link>
                      )}
                    </div>
                    {(p.kind === "stay" || p.kind === "session") && <p className="-mt-0.5 text-xs font-semibold text-muted">{p.kind === "stay" ? "a night" : "a session"}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {shopReviews.length > 0 && (
          <section className="px-4 pt-7">
            <h2 id="reviews" className="mb-2.5 scroll-mt-4 text-[17px] font-extrabold">
              Reviews <span className="font-bold text-muted">★ {stats.rating?.toFixed(1)} ({stats.reviews})</span>
            </h2>
            <div className="cards">
              {shopReviews.map(({ review: r, name, ward: w }) => (
                <div key={r.id} className="rounded-[18px] border border-line bg-white px-4 py-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">
                      {name.split(" ")[0]} <span className="font-medium text-muted">· {w}</span>
                    </p>
                    <p className="text-xs font-semibold text-muted">{when.format(r.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-[13px] tracking-[2px] text-[#C2410C]" aria-label={`${r.stars} stars`}>
                    {"★".repeat(r.stars)}
                    <span className="text-[#c8ceda]">{"★".repeat(5 - r.stars)}</span>
                  </p>
                  {r.tags.length > 0 && <p className="mt-1 text-[13px] font-semibold">{r.tags.join(" · ")}</p>}
                  {r.text && <p className="mt-1 leading-relaxed text-[#3a4458]">{r.text}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        <CheckoutBar href={basket.shopId === shop.id ? "/checkout" : "/basket"} />
        <TabBar active="Home" />
      </main>
    </BasketProvider>
  );
}
