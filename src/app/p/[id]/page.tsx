import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { basketStart } from "@/lib/basket-view";
import { cutoffLabel, dayList, naira } from "@/lib/catalog";
import { BasketBar, BasketProvider, Stepper } from "@/components/basket-controls";
import TabBar from "@/components/tab-bar";
import Photo from "@/components/photo";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ product: products, shop: shops })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, id), eq(products.removed, false)))
    .limit(1);
  if (!row || (!row.product.isActive && row.shop.ownerId !== me.id)) notFound();
  const { product: p, shop } = row;
  const [[d], basket] = await Promise.all([
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    basketStart(),
  ]);
  const canBuy = shop.isOpen && p.isActive && shop.ownerId !== me.id;

  const facts = [
    d && { title: "Delivery", body: `${dayList(d.deliveryDays)} · order by ${cutoffLabel(d.orderCutoff)}` },
    d?.pickupOn && { title: "Pickup", body: [d.pickupSpot, d.pickupHours].filter(Boolean).join(" · ") || "Free pickup" },
    d?.dropOffOn && { title: "Seller drops it off", body: d.dropOffAreas.join(", ") },
    d?.riderOn && {
      title: "Rider",
      body: d.riderPayer === "buyer_on_arrival" ? `About ${d.riderEstimate ?? "₦2,000 – ₦3,500"}, paid to the rider` : "Rider fee added at checkout",
    },
  ].filter(Boolean) as { title: string; body: string }[];

  return (
    <BasketProvider initialQty={basket.qty} initialCount={basket.count} initialTotal={basket.totalKobo}>
      <main className="mx-auto min-h-dvh max-w-md pb-44">
        <div className="relative">
          <div className="flex h-[300px] snap-x snap-mandatory overflow-x-auto bg-chip [scrollbar-width:none] md:h-[420px]">
            {p.photos.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0 snap-center">
                <Photo src={src} alt={i === 0 ? p.name : ""} sizes="(min-width: 1200px) 52rem, (min-width: 768px) 44rem, 100vw" priority={i === 0} />
              </div>
            ))}
          </div>
          <Link
            href={`/s/${shop.slug}`}
            aria-label="Back to shop"
            className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          {p.photos.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
              {p.photos.length} photos · swipe
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 pt-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{p.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="text-xl font-extrabold">{naira(p.priceKobo)}</span>
              {p.size && <span className="text-sm text-muted">{p.size}</span>}
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.sellMode === "preorder" ? "bg-[#fdf0d5] text-[#7a4d06]" : "bg-[#ddf3e4] text-[#1b6b3a]"}`}>
                {p.sellMode === "preorder" ? "Pre-order" : "In stock"}
              </span>
            </div>
          </div>

          <Link href={`/s/${shop.slug}`} className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-soft">
{shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="40px" />}
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">{shop.name}</span>
              <span className="block text-xs font-bold text-accent">Verified member · {shop.area}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>

          {facts.length > 0 && (
            <section className="rounded-[18px] bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              {facts.map((f, i) => (
                <div key={f.title} className={`py-3 ${i < facts.length - 1 ? "border-b border-[#eef0f4]" : ""}`}>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-[13px] text-muted">{f.body}</p>
                </div>
              ))}
            </section>
          )}

          {!canBuy && (
            <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">
              {shop.ownerId === me.id ? "This is your product." : "Not available to order right now."}
            </p>
          )}
          {canBuy && (
            <div className="flex items-center justify-between rounded-[18px] bg-white p-3 pl-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <span className="text-[15px] font-bold">In your basket</span>
              <Stepper productId={p.id} name={p.name} />
            </div>
          )}
        </div>
        <BasketBar />
        <TabBar active="Home" />
      </main>
    </BasketProvider>
  );
}
