import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, shops } from "@/db/schema";
import { currentMember } from "@/lib/auth";
import { readBasket } from "@/lib/basket";
import { productsByIds } from "@/lib/browse";
import { cutoffLabel, dayList, naira } from "@/lib/catalog";
import { BasketProvider, Stepper } from "@/components/basket-controls";
import { Note } from "@/components/ui";
import TabBar from "@/components/tab-bar";
import { clearBasket } from "./actions";
import Photo from "@/components/photo";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function BasketPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { payment } = await searchParams;
  const basket = await readBasket();

  if (!basket) {
    return (
      <main className="mx-auto min-h-dvh max-w-md pb-28">
        <div className="px-4 pt-5">
          <h1 className="text-[26px] font-extrabold tracking-tight">Basket</h1>
          <div className="mt-6 rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-8 text-center">
            <p className="text-[15px] font-bold">Your basket is empty</p>
            <p className="mt-1 text-[13px] text-muted">Find something from a member near you.</p>
            <Link href={(await currentMember()) ? "/home" : "/"} className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
              Browse shops
            </Link>
          </div>
        </div>
        <TabBar active="Basket" />
      </main>
    );
  }

  const [rows, [shop], [d]] = await Promise.all([
    productsByIds(Object.keys(basket.items)),
    db.select().from(shops).where(eq(shops.id, basket.shopId)).limit(1),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, basket.shopId)).limit(1),
  ]);
  const live = rows.filter((r) => r.product.isActive && !r.product.removed && r.product.shopId === basket.shopId);
  const gone = rows.length - live.length + (Object.keys(basket.items).length - rows.length);
  const qty = Object.fromEntries(live.map((r) => [r.product.id, basket.items[r.product.id]]));
  const count = Object.values(qty).reduce((a, n) => a + n, 0);
  const total = live.reduce((s, r) => s + r.product.priceKobo * (qty[r.product.id] ?? 0), 0);

  return (
    <BasketProvider initialQty={qty} initialCount={count} initialTotal={total}>
      <main className="mx-auto min-h-dvh max-w-md pb-28">
        <div className="flex flex-col gap-4 px-4 pt-5">
          <div className="flex items-baseline justify-between">
            <h1 className="text-[26px] font-extrabold tracking-tight">Basket</h1>
            <form action={clearBasket}>
              <SubmitButton pendingText="…" className="text-[13px] font-bold text-muted">
                Clear
              </SubmitButton>
            </form>
          </div>

          {shop && (
            <Link href={`/s/${shop.slug}`} className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-[12px] bg-soft">
{shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="44px" />}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-bold">{shop.name}</span>
                {d && (
                  <span className="block text-[13px] text-muted">
                    Delivers {dayList(d.deliveryDays)} · order by {cutoffLabel(d.orderCutoff)}
                  </span>
                )}
              </span>
              <span className="text-[13px] font-bold text-accent">Add more</span>
            </Link>
          )}

          {payment === "failed" && <Note tone="amber">Your payment didn&apos;t go through, so no order was placed. You can try again.</Note>}
          {gone > 0 && <Note tone="amber">Some items are no longer available, so we took them out.</Note>}
          {shop && !shop.isOpen && <Note tone="amber">This shop has closed for now, so you can&apos;t order yet.</Note>}

          <section className="flex flex-col gap-2.5">
            {live.map(({ product: p }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
                <div className="relative size-[56px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
{p.photos[0] && <Photo src={p.photos[0]} sizes="56px" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{p.name}</p>
                  <p className="text-[13px] text-muted">{[p.size, naira(p.priceKobo)].filter(Boolean).join(" · ")}</p>
                </div>
                <Stepper productId={p.id} name={p.name} />
              </div>
            ))}
          </section>

          <div className="flex items-center justify-between px-1 text-[17px] font-extrabold">
            <span>Items total</span>
            <span>{naira(total)}</span>
          </div>
          {shop?.isOpen && live.length > 0 && (
            <Link href="/checkout" className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white">
              Checkout
            </Link>
          )}
        </div>
        <TabBar active="Basket" />
      </main>
    </BasketProvider>
  );
}
