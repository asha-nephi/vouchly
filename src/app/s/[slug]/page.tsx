import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { cutoffLabel, dayList, naira } from "@/lib/catalog";
import { BasketBar, BasketProvider, Stepper } from "@/components/basket-controls";
import TabBar from "@/components/tab-bar";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireUser();
  const { slug } = await params;
  const [row] = await db
    .select({ shop: shops, ward: users.ward })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(eq(shops.slug, slug))
    .limit(1);
  if (!row) notFound();
  const { shop, ward } = row;
  const isMine = shop.ownerId === me.id;

  const [items, [d], basket] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.isActive, true), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    basketStart(),
  ]);
  const days = d ? dayList(d.deliveryDays) : null;
  const ways = d ? [d.pickupOn && "Pickup", d.dropOffOn && "Seller drop-off", d.riderOn && "Rider"].filter(Boolean).join(" · ") : "";
  const canBuy = shop.isOpen && !isMine;

  return (
    <BasketProvider initialQty={basket.qty} initialCount={basket.count} initialTotal={basket.totalKobo}>
      <main className="mx-auto min-h-dvh max-w-md pb-44">
        <div className="relative h-[220px] bg-soft">
          {shop.coverPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.coverPhoto} alt="" className="size-full object-cover" />
          )}
          <Link
            href={isMine ? "/shop/manage" : "/home"}
            aria-label="Back"
            className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>
        <div className="relative -mt-9 px-4">
          <section className="flex flex-col gap-2 rounded-3xl bg-white p-[18px] shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <h1 className="text-[22px] font-extrabold tracking-tight">{shop.name}</h1>
            {shop.about && <p className="text-sm leading-relaxed text-muted">{shop.about}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-deep">Verified member</span>
              <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">{ward}</span>
              <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">{shop.area}</span>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-4">
          {isMine && (
            <p className="rounded-[14px] bg-[#fdf0d5] px-4 py-3 text-[13px] font-semibold text-[#3a2a08]">This is how buyers see your shop.</p>
          )}
          {!shop.isOpen && <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">This shop is closed for now.</p>}
          {d && days && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-soft px-4 py-3 text-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e39a8" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
                <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" />
              </svg>
              <span>
                <b>Delivers {days}.</b> Order by {cutoffLabel(d.orderCutoff)}.
                {ways && <span className="mt-0.5 block text-[13px] text-[#3a4458]">{ways}</span>}
              </span>
            </div>
          )}
          <h2 className="pt-1 text-base font-extrabold">Products</h2>
          {items.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <Link href={`/p/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="size-[64px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
                  {p.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0]} alt="" loading="lazy" className="size-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{p.name}</p>
                  <p className="truncate text-[13px] text-muted">{[p.size, p.sellMode === "preorder" ? "Pre-order" : "In stock"].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm font-extrabold">{naira(p.priceKobo)}</p>
                </div>
              </Link>
              <Stepper productId={p.id} name={p.name} disabled={!canBuy} />
            </div>
          ))}
        </div>
        <BasketBar />
        <TabBar active="Home" />
      </main>
    </BasketProvider>
  );
}
