import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cutoffLabel, DAY_NAMES, naira } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// The buyer's view of a shop. Ordering comes in the next step.
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

  const [items, [d]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.isActive, true), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
  ]);
  const nextDay = d ? d.deliveryDays.map((i) => DAY_NAMES[i]).join(" & ") : null;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
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
          <p className="rounded-[14px] bg-[#fdf0d5] px-4 py-3 text-[13px] font-semibold text-[#3a2a08]">
            This is how buyers see your shop.
          </p>
        )}
        {!shop.isOpen && <p className="rounded-[14px] bg-chip px-4 py-3 text-[13px] font-semibold">This shop is closed for now.</p>}
        {d && nextDay && (
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm">
            <b>Next delivery: {nextDay}.</b> Order by {cutoffLabel(d.orderCutoff)}.
          </div>
        )}
        <h2 className="pt-1 text-base font-extrabold">Products</h2>
        {items.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <div className="size-[64px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
              {p.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photos[0]} alt="" loading="lazy" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">{p.name}</p>
              {p.size && <p className="text-[13px] text-muted">{p.size}</p>}
              <p className="text-sm font-extrabold">{naira(p.priceKobo)}</p>
            </div>
            <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">
              {p.sellMode === "preorder" ? "Pre-order" : "In stock"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
