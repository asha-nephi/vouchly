import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { takenNights } from "@/lib/bookings";
import { todayKey } from "@/lib/dates";
import { myShop } from "@/lib/shops";
import { BackBar, Note } from "@/components/ui";
import BlockForm from "./block-form";

export const dynamic = "force-dynamic";

export default async function StayCalendar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.kind, "stay"), eq(products.removed, false)))
    .limit(1);
  if (!p) notFound();
  const today = todayKey();
  const all = await takenNights({ ...p, blockedDates: [] });
  const booked = [...all].filter((k) => k >= today);
  const blocked = p.blockedDates.filter((k) => k >= today);
  const { saved } = await searchParams;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Calendar" href={`/shop/manage/products/${p.id}`} />
      <div className="flex flex-col gap-4 px-4">
        <p className="text-[15px] font-extrabold">{p.name}</p>
        {saved && <Note tone="green">Calendar saved.</Note>}
        <Note>Tap nights you can&apos;t host to block them. Tap again to free them. Booked nights are blue.</Note>
        <BlockForm id={p.id} today={today} blocked={blocked} booked={booked} />
      </div>
    </main>
  );
}
