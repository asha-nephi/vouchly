import type { Metadata } from "next";
import { clip, shareMeta } from "@/lib/share-meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, reviews, shops, users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { categoryLabel, cutoffLabel, dayList, naira } from "@/lib/catalog";
import {
  BasketBar,
  BasketProvider,
  Stepper,
} from "@/components/basket-controls";
import TabBar from "@/components/tab-bar";
import Photo from "@/components/photo";
import ShareButton from "@/components/share-button";
import { listingLine, priceText } from "@/lib/listings";

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

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const me = await currentUser();
  const { slug } = await params;
  const [row] = await db
    .select({ shop: shops, ward: users.ward })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(eq(shops.slug, slug))
    .limit(1);
  if (!row) notFound();
  const { shop, ward } = row;
  const isMine = shop.ownerId === me?.id;

  const [items, [d], basket, shopReviews, [score]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.shopId, shop.id),
          eq(products.isActive, true),
          eq(products.removed, false),
        ),
      )
      .orderBy(asc(products.createdAt)),
    db
      .select()
      .from(deliverySettings)
      .where(eq(deliverySettings.shopId, shop.id))
      .limit(1),
    basketStart(),
    db
      .select({ review: reviews, name: users.name, ward: users.ward })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.shopId, shop.id))
      .orderBy(desc(reviews.createdAt))
      .limit(10),
    db
      .select({
        avg: sql<
          number | null
        >`round(avg(${reviews.stars})::numeric, 1)::float`,
        n: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(eq(reviews.shopId, shop.id)),
  ]);
  const when = new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
  const days = d ? dayList(d.deliveryDays) : null;
  const ways = d
    ? [
        d.pickupOn && "Pickup",
        d.dropOffOn && "Seller drop-off",
        d.riderOn && "Rider",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const canBuy = shop.isOpen && !isMine;

  return (
    <BasketProvider
      initialQty={basket.qty}
      initialCount={basket.count}
      initialTotal={basket.totalKobo}
    >
      <main className="mx-auto min-h-dvh max-w-md pb-44">
        <div className="relative h-[220px] bg-soft md:h-[300px]">
          {shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="(min-width: 1200px) 52rem, (min-width: 768px) 44rem, 100vw" priority />}
          <Link
            href={isMine ? "/shop/manage" : me && !me.isGuest ? "/home" : "/"}
            aria-label="Back"
            className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <ShareButton
            title={shop.name}
            text={`${shop.name} on Vouchly`}
            path={`/s/${shop.slug}`}
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
          />
        </div>
        <div className="relative -mt-9 px-4">
          <section className="flex flex-col gap-2 rounded-3xl bg-white p-[18px] shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              {shop.name}
            </h1>
            {shop.about && (
              <p className="text-sm leading-relaxed text-muted">{shop.about}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {score?.n ? (
                <a
                  href="#reviews"
                  className="rounded-full bg-[#fdf0d5] px-2.5 py-1 text-xs font-bold text-[#3a2a08]"
                >
                  ★ {score.avg?.toFixed(1)} · {score.n}{" "}
                  {score.n === 1 ? "review" : "reviews"}
                </a>
              ) : null}
              <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-deep">
                Verified member
              </span>
              <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">
                {ward}
              </span>
              <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">
                {shop.area}
              </span>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-4">
          {isMine && (
            <p className="rounded-[14px] bg-[#fdf0d5] px-4 py-3 text-[13px] font-semibold text-[#3a2a08]">
              This is how buyers see your shop.
            </p>
          )}
          {!shop.isOpen && (
            <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">
              This shop is closed for now.
            </p>
          )}
          {d && days && items.some((i) => i.kind === "item") && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-soft px-4 py-3 text-sm">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e39a8"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" />
              </svg>
              <span>
                <b>Delivers {days}.</b> Order by {cutoffLabel(d.orderCutoff)}.
                {ways && (
                  <span className="mt-0.5 block text-[13px] text-[#3a4458]">
                    {ways}
                  </span>
                )}
              </span>
            </div>
          )}
          <h2 className="pt-1 text-base font-extrabold">{items.every((i) => i.kind === "item") ? "Products" : items.every((i) => i.kind === "stay") ? "Places to stay" : items.every((i) => i.kind === "service") ? "Services" : "Listings"}</h2>
          {items.length === 0 && (
            <p className="text-sm text-muted">No products yet.</p>
          )}
          <div className="cards">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
              >
                <Link
                  href={`/p/${p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="relative size-[64px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
{p.photos[0] && <Photo src={p.photos[0]} sizes="64px" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{p.name}</p>
                    <p className="truncate text-[13px] text-muted">
                      {listingLine(p)}
                    </p>
                    <p className="text-sm font-extrabold">
                      {priceText(p)}
                    </p>
                  </div>
                </Link>
                {p.kind === "item" ? (
                  <Stepper productId={p.id} name={p.name} disabled={!canBuy} />
                ) : (
                  <Link href={`/p/${p.id}`} className="flex h-10 shrink-0 items-center rounded-full bg-ink px-4 text-sm font-bold text-white">
                    {p.kind === "stay" ? "Book" : p.kind === "digital" ? (p.priceKobo === 0 ? "Get" : "Buy") : p.priceType === "quote" ? "Ask" : "Book"}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {shopReviews.length > 0 && (
            <>
              <h2 id="reviews" className="pt-3 text-base font-extrabold">
                Reviews{" "}
                <span className="text-sm font-semibold text-muted">
                  · ★ {score?.avg?.toFixed(1)} from {score?.n}
                </span>
              </h2>
              <div className="cards">
                {shopReviews.map(({ review: r, name, ward }) => (
                  <div
                    key={r.id}
                    className="rounded-[20px] bg-white p-4 text-sm shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">
                        {name.split(" ")[0]}{" "}
                        <span className="font-medium text-muted">· {ward}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {when.format(r.createdAt)}
                      </p>
                    </div>
                    <p
                      className="text-[#e9a23b]"
                      aria-label={`${r.stars} stars`}
                    >
                      {"★".repeat(r.stars)}
                      <span className="text-[#c8ceda]">
                        {"★".repeat(5 - r.stars)}
                      </span>
                    </p>
                    {r.tags.length > 0 && (
                      <p className="text-[13px] font-semibold">
                        {r.tags.join(" · ")}
                      </p>
                    )}
                    {r.text && (
                      <p className="mt-1 leading-relaxed text-[#3a4458]">
                        {r.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <BasketBar />
        <TabBar active="Home" />
      </main>
    </BasketProvider>
  );
}
