import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops, users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { readBasket } from "@/lib/basket";
import { nextDeliveryDay, deliveryDayLabel, holdMode } from "@/lib/orders";
import CheckoutForm from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function Checkout() {
  const user = await currentUser();
  const basket = await readBasket();
  if (!basket) redirect("/basket");

  const [[shop], [d], rows] = await Promise.all([
    db.select({ shop: shops, confirmed: users.confirmed }).from(shops).innerJoin(users, eq(users.id, shops.ownerId)).where(eq(shops.id, basket.shopId)).limit(1),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, basket.shopId)).limit(1),
    db
      .select()
      .from(products)
      .where(and(inArray(products.id, Object.keys(basket.items)), eq(products.isActive, true), eq(products.removed, false))),
  ]);
  if (!shop || !d || !rows.length) redirect("/basket");

  const lines = rows.map((p) => ({ id: p.id, name: p.name, size: p.size, photo: p.photos[0] ?? null, priceKobo: p.priceKobo, qty: basket.items[p.id] }));
  const inStockOnly = rows.every((p) => p.sellMode === "in_stock");
  const day = nextDeliveryDay(d.deliveryDays, d.orderCutoff, new Date(), inStockOnly);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-32">
      <header className="flex items-center gap-3 px-4 py-3.5">
        <Link href="/basket" aria-label="Back to basket" className="flex size-11 items-center justify-center rounded-full border border-line bg-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold">Checkout</h1>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D7A46" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Secure
        </span>
      </header>
      <CheckoutForm
        shopName={shop.shop.name}
        confirmed={shop.confirmed}
        dayLabel={day ? deliveryDayLabel(day) : null}
        lines={lines}
        defaultArea={user?.area ?? shop.shop.area}
        guest={!user}
        hold={holdMode()}
        options={{
          pickup: d.pickupOn ? { spot: d.pickupSpot ?? shop.shop.area, hours: d.pickupHours } : null,
          dropOff: d.dropOffOn ? { areas: d.dropOffAreas, feeKobo: d.dropOffFeeKobo } : null,
          rider: d.riderOn
            ? d.riderPayer === "fee_in_order"
              ? { payOnArrival: false, feeKobo: d.riderAreaFees.default ?? 0, estimate: null }
              : { payOnArrival: true, feeKobo: 0, estimate: d.riderEstimate ?? "₦2,000 – ₦3,500" }
            : null,
        }}
      />
    </main>
  );
}
