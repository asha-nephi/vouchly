import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isDayKey, keyToDate } from "@/lib/dates";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel, telLink } from "@/lib/orders";
import { OPEN } from "@/lib/order-status";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import PrintButton from "@/components/print-button";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)] print:shadow-none print:border print:border-line";
const local = (phone: string) => "0" + phone.slice(3);

// One delivery day: what to pack, and who gets what, grouped by area.
export default async function DayList({ params }: { params: Promise<{ day: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { day } = await params;
  if (!isDayKey(day)) notFound();

  const rows = await db
    .select({ order: orders, buyer: users.name, phone: users.phone })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(
      and(
        eq(orders.shopId, shop.id),
        eq(orders.deliveryDay, keyToDate(day)),
        inArray(orders.method, ["pickup", "drop_off", "rider"]),
        inArray(orders.status, [...OPEN]),
      ),
    )
    .orderBy(asc(orders.createdAt));
  const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.order.id))) : [];

  // Packing list for the whole day.
  const pack = new Map<string, number>();
  for (const it of items) {
    const name = [it.name, it.size].filter(Boolean).join(", ");
    pack.set(name, (pack.get(name) ?? 0) + it.quantity);
  }

  // Groups: pickup first, then each area.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.order.method === "pickup" ? "Pickup" : (r.order.address?.split(", ").pop() ?? "Other");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const sorted = [...groups].sort(([a], [b]) => (a === "Pickup" ? -1 : b === "Pickup" ? 1 : a.localeCompare(b)));

  const lineText = (orderId: string) =>
    items
      .filter((i) => i.orderId === orderId)
      .map((i) => `${i.quantity} × ${[i.name, i.size].filter(Boolean).join(", ")}`)
      .join(", ");

  // Text for a rider: every drop-off and rider order, with address and phone.
  const away = rows.filter((r) => r.order.method !== "pickup");
  const riderText = [
    `${shop.name}: deliveries for ${deliveryDayLabel(keyToDate(day))}`,
    ...away.map((r, i) => `\n${i + 1}. ${r.buyer} (${local(r.phone)})\n${r.order.address}\n${lineText(r.order.id)}\nOrder ${r.order.code}${r.order.note ? `\nNote: ${r.order.note}` : ""}`),
  ].join("\n");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10 lg:max-w-3xl">
      <div className="print:hidden">
        <BackBar title="Day list" href="/shop/manage/orders" />
      </div>
      <div className="flex flex-col gap-4 px-4">
        <div>
          <h2 className="text-xl font-extrabold">{deliveryDayLabel(keyToDate(day))}</h2>
          <p className="text-sm text-muted">
            {shop.name} · {rows.length} {rows.length === 1 ? "order" : "orders"}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center text-sm text-muted">
            No paid orders to deliver on this day.
          </p>
        ) : (
          <>
            <div className="flex gap-2 print:hidden">
              <PrintButton />
              {away.length > 0 && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(riderText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent px-3 text-sm font-extrabold text-white"
                >
                  Send to rider
                </a>
              )}
            </div>

            <section className="rounded-[18px] bg-soft px-4 py-3 print:border print:border-line print:bg-white">
              <h3 className="text-xs font-bold text-deep">To pack</h3>
              {[...pack].map(([name, n]) => (
                <p key={name} className="text-[15px] font-bold">
                  {n} × {name}
                </p>
              ))}
            </section>

            {sorted.map(([area, list]) => (
              <section key={area} className="flex flex-col gap-2.5 break-inside-avoid">
                <h3 className="pt-1 text-base font-extrabold">
                  {area} <span className="text-sm font-semibold text-muted">· {list.length}</span>
                </h3>
                <div className="cards">
                  {list.map(({ order: o, buyer, phone }) => (
                    <div key={o.id} className={`${card} break-inside-avoid p-4`}>
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/shop/manage/orders/${o.code}`} className="min-w-0 text-[15px] font-bold hover:underline">
                          {buyer}
                        </Link>
                        <span className="shrink-0 text-xs font-semibold text-muted">{o.code}</span>
                      </div>
                      <p className="mt-1 text-[14px] font-semibold">{lineText(o.id)}</p>
                      {o.address && <p className="mt-1 text-[13px] text-muted">{o.address}</p>}
                      {o.note && <p className="mt-1 text-[13px] text-muted">Note: {o.note}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                        <a href={telLink(phone)} className="font-bold text-accent">
                          {local(phone)}
                        </a>
                        <span className="font-semibold text-muted">{naira(o.itemsKobo + o.deliveryFeeKobo)} paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
