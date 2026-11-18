import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { shortDay } from "@/lib/dates";
import { statusLabel } from "@/lib/order-status";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import type { Params } from "@/components/data/params";
import { bookings, BookingsList } from "./bookings-list";
import StayTabs from "./stay-tabs";

export const dynamic = "force-dynamic";

// Bookings for one stay. Computers: a table with the order in a side panel. Phones: a plain list.
export default async function StayBookings({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
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
  const sp = await searchParams;
  const list = (await bookings(p.id)).sort((a, b) => b.inKey.localeCompare(a.inKey));

  return (
    <>
      <main className="hidden px-8 py-6 lg:block">
        <StayTabs id={p.id} name={p.name} on="list" />
        <BookingsList shop={shop} productId={p.id} path={`/shop/manage/products/${p.id}/bookings`} sp={sp} />
      </main>
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Bookings" href={`/shop/manage/products/${p.id}/calendar`} />
        <div className="flex flex-col gap-2.5 px-4">
          <p className="text-[15px] font-extrabold">{p.name}</p>
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted">No bookings yet.</p>}
          {list.map((r) => (
            <Link key={r.code} href={`/shop/manage/orders/${r.code}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{r.buyer}</span>
                <span className="block text-xs text-muted">
                  {shortDay(r.inKey)} → {shortDay(r.outKey)}, {r.nights} {r.nights === 1 ? "night" : "nights"}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-muted">{statusLabel(r.status, r.method, true)}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
