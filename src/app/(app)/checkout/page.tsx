import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { readBasket } from "@/lib/basket";
import { nextDeliveryDay, deliveryDayLabel, holdMode } from "@/lib/orders";
import { BackBar } from "@/components/ui";
import CheckoutForm from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function Checkout() {
  const user = await requireUser();
  const basket = await readBasket();
  if (!basket) redirect("/basket");

  const [[shop], [d], rows] = await Promise.all([
    db.select().from(shops).where(eq(shops.id, basket.shopId)).limit(1),
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
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Checkout" href="/basket" />
      <CheckoutForm
        shopName={shop.name}
        dayLabel={day ? deliveryDayLabel(day) : null}
        lines={lines}
        defaultArea={user.area ?? shop.area}
        hold={holdMode()}
        options={{
          pickup: d.pickupOn ? { spot: d.pickupSpot ?? shop.area, hours: d.pickupHours } : null,
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
