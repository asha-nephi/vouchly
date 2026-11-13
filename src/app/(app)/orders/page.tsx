import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, shops } from "@/db/schema";
import { requireBuyer } from "@/lib/auth";
import { maybeSettle } from "@/lib/after-order";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel } from "@/lib/orders";
import { STATUS, statusLabel, TONE } from "@/lib/order-status";
import TabBar from "@/components/tab-bar";
import Photo from "@/components/photo";

export const dynamic = "force-dynamic";

export default async function MyOrders() {
  const user = await requireBuyer();
  await maybeSettle();
  const rows = await db
    .select({ order: orders, shopName: shops.name, photo: shops.coverPhoto })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(
      and(eq(orders.buyerId, user.id), ne(orders.status, "awaiting_payment")),
    )
    .orderBy(desc(orders.createdAt))
    .limit(50);
  const active = rows.filter(
    (r) => !["received", "cancelled"].includes(r.order.status),
  );
  const past = rows.filter((r) =>
    ["received", "cancelled"].includes(r.order.status),
  );

  const card = (r: (typeof rows)[number]) => {
    const s = { label: statusLabel(r.order.status, r.order.method), tone: STATUS[r.order.status].tone };
    return (
      <Link
        key={r.order.id}
        href={`/orders/${r.order.code}`}
        className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]"
      >
        <span className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-soft">
{r.photo && <Photo src={r.photo} sizes="60px" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">
            {r.shopName}
          </span>
          <span className="block text-[13px] text-muted">
            {naira(r.order.itemsKobo + r.order.deliveryFeeKobo)} ·{" "}
            {r.order.code}
          </span>
          <span className="block text-xs font-semibold text-muted">
            {deliveryDayLabel(r.order.deliveryDay)}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s.tone]}`}
        >
          {s.label}
        </span>
      </Link>
    );
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex flex-col gap-3 px-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold tracking-tight">My orders</h1>
          {user.isGuest && (
            <Link href="/notifications" className="text-[13px] font-bold text-accent">
              Notifications
            </Link>
          )}
        </div>
        {rows.length === 0 && (
          <div className="rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-8 text-center">
            <p className="text-[15px] font-bold">No orders yet</p>
            <Link
              href={user.isGuest ? "/" : "/home"}
              className="mt-3 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white"
            >
              Browse shops
            </Link>
          </div>
        )}
        {active.length > 0 && (
          <p className="pt-1 text-[13px] font-bold text-muted">Active</p>
        )}
        {active.length > 0 && <div className="cards">{active.map(card)}</div>}
        {past.length > 0 && (
          <p className="pt-2 text-[13px] font-bold text-muted">Earlier</p>
        )}
        {past.length > 0 && <div className="cards">{past.map(card)}</div>}
      </div>
      <TabBar active="Me" />
    </main>
  );
}
