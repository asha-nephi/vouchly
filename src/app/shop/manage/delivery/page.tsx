import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import DeliveryForm from "./delivery-form";

export const dynamic = "force-dynamic";

export default async function Delivery({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { new: isNew } = await searchParams;
  const [s] = await db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1);
  const settings = s ?? {
    deliveryDays: [6],
    orderCutoff: "thu 18:00",
    pickupOn: true,
    pickupSpot: null,
    pickupHours: null,
    dropOffOn: false,
    dropOffAreas: [shop.area],
    dropOffFeeKobo: 0,
    riderOn: false,
    riderPayer: "buyer_on_arrival" as const,
    riderEstimate: "₦2,000 – ₦3,500",
    riderAreaFees: {},
  };
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Delivery & pickup" href="/shop/manage" />
      <DeliveryForm s={settings} isNew={isNew === "1"} />
    </main>
  );
}
