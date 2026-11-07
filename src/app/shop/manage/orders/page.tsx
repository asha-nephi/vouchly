import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { maybeSettle } from "@/lib/after-order";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel } from "@/lib/orders";
import { SELLER_STATUS, TO_DO, TONE } from "@/lib/order-status";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";
const METHOD = { pickup: "Pickup", drop_off: "You drop off", rider: "Rider" } as const;

export default async function ShopOrders({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  await maybeSettle();
  const done = (await searchParams).tab === "done";

  const rows = await db
    .select({ order: orders, buyer: users.name })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orders.shopId, shop.id), inArray(orders.status, done ? ["received", "cancelled"] : [...TO_DO])))
    .orderBy(done ? desc(orders.deliveryDay) : asc(orders.deliveryDay), asc(orders.createdAt))
    .limit(done ? 50 : 200);
  const items = rows.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.order.id)))
    : [];

  // Group by delivery day, with a total of what to make.
  const days = new Map<string, { label: string; rows: typeof rows; make: Map<string, number> }>();
  for (const r of rows) {
    const key = r.order.deliveryDay.toISOString();
    if (!days.has(key)) days.set(key, { label: deliveryDayLabel(r.order.deliveryDay), rows: [], make: new Map() });
    const g = days.get(key)!;
    g.rows.push(r);
    if (r.order.status !== "cancelled") {
      for (const it of items.filter((i) => i.orderId === r.order.id)) {
        const name = [it.name, it.size].filter(Boolean).join(", ");
        g.make.set(name, (g.make.get(name) ?? 0) + it.quantity);
      }
    }
  }

  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} className={`flex h-10 flex-1 items-center justify-center rounded-full text-sm font-bold ${on ? "bg-ink text-white" : "text-muted"}`}>
      {label}
    </Link>
  );

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Orders" href="/shop/manage" />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          {tab("/shop/manage/orders", "To do", !done)}
          {tab("/shop/manage/orders?tab=done", "Done", done)}
        </div>

        {rows.length === 0 && (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center text-sm text-muted">
            {done ? "Finished orders will show here." : "No orders to work on. New ones will show here."}
          </p>
        )}

        {[...days.values()].map((g) => (
          <section key={g.label} className="flex flex-col gap-2.5">
            <h2 className="pt-1 text-base font-extrabold">
              {g.label} <span className="text-sm font-semibold text-muted">· {g.rows.length} {g.rows.length === 1 ? "order" : "orders"}</span>
            </h2>
            {!done && g.make.size > 0 && (
              <div className="rounded-[18px] bg-soft px-4 py-3">
                <p className="text-xs font-bold text-deep">To make</p>
                {[...g.make].map(([name, n]) => (
                  <p key={name} className="text-[15px] font-bold">
                    {n} × {name}
                  </p>
                ))}
              </div>
            )}
            {g.rows.map(({ order: o, buyer }) => {
              const s = SELLER_STATUS[o.status];
              const lines = items.filter((i) => i.orderId === o.id);
              return (
                <Link key={o.id} href={`/shop/manage/orders/${o.code}`} className={`${card} flex items-center gap-3 p-4`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{buyer}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
                    </span>
                    <span className="block text-xs font-semibold text-muted">
                      {o.code} · {METHOD[o.method]} · {naira(o.itemsKobo + o.deliveryFeeKobo)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
