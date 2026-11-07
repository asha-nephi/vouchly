import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel, holdMode } from "@/lib/orders";
import { STATUS, timeline } from "@/lib/order-status";
import { BackBar, Note } from "@/components/ui";
import { markReceived } from "../actions";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ placed?: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const { placed } = await searchParams;
  const [row] = await db
    .select({ order: orders, shop: shops })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id)))
    .limit(1);
  if (!row) notFound();
  const { order: o, shop } = row;
  const [items, [d]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
  ]);
  const total = o.itemsKobo + o.deliveryFeeKobo;
  const s = STATUS[o.status];
  const open = ["paid", "confirmed", "preparing", "ready", "on_the_way"].includes(o.status);
  const hold = holdMode();
  const where =
    o.method === "pickup"
      ? `Pickup: ${[d?.pickupSpot, d?.pickupHours].filter(Boolean).join(" · ") || shop.area}`
      : o.method === "drop_off"
        ? `Seller drops it off: ${o.address}`
        : `Rider to: ${o.address}`;

  if (placed && o.status !== "awaiting_payment") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col">
        <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-20 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-[#ddf3e4]">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#1b6b3a]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </span>
          <h1 className="text-[28px] font-extrabold tracking-tight">Order placed!</h1>
          <p className="text-[15px] leading-relaxed text-muted">
            {hold
              ? `${naira(total)} is held safely until you receive your order.`
              : `You paid ${naira(total)}. ${shop.name} will have it ready on ${deliveryDayLabel(o.deliveryDay)}.`}
          </p>
          <section className={`${card} w-full p-4 text-left`}>
            {[
              ["Order", o.code],
              ["From", shop.name],
              ["Delivery day", deliveryDayLabel(o.deliveryDay)],
              ["How", where],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between gap-4 py-1.5 text-sm">
                <span className="text-muted">{a}</span>
                <span className="text-right font-semibold">{b}</span>
              </div>
            ))}
          </section>
        </div>
        <div className="flex flex-col gap-2.5 px-4 pb-8 pt-6">
          <Link href={`/orders/${o.code}`} className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white">
            Track my order
          </Link>
          <Link href="/home" className="flex h-[54px] items-center justify-center rounded-2xl border border-[#d5dae4] bg-white text-[15px] font-bold">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title={`Order ${o.code}`} href="/orders" />
      <div className="flex flex-col gap-4 px-4">
        <section className="flex items-center gap-3.5 rounded-[20px] bg-ink p-4 text-white">
          <span className="size-14 shrink-0 overflow-hidden rounded-[14px] bg-deep">
            {shop.coverPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.coverPhoto} alt="" className="size-full object-cover" />
            )}
          </span>
          <div>
            <p className="text-lg font-extrabold">{s.label}</p>
            <p className="text-[13px] text-[#c9d1e3]">
              {shop.name} · {deliveryDayLabel(o.deliveryDay)}
            </p>
          </div>
        </section>

        {o.status === "awaiting_payment" && <Note tone="amber">This order wasn&apos;t paid, so the seller hasn&apos;t seen it.</Note>}

        {!["awaiting_payment", "cancelled"].includes(o.status) && (
          <section className={`${card} p-4`}>
            {timeline(o.status, o.method).map((t, i, all) => (
              <div key={t.key} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      t.state === "done" ? "bg-[#1b6b3a] text-white" : t.state === "now" ? "bg-ink text-white" : "border-2 border-[#c8ceda]"
                    }`}
                    aria-hidden="true"
                  >
                    {t.state === "done" ? "✓" : t.state === "now" ? "•" : ""}
                  </span>
                  {i < all.length - 1 && <span className={`h-7 w-0.5 ${t.state === "done" ? "bg-[#1b6b3a]" : "bg-[#e3e6ec]"}`} />}
                </div>
                <p className={`text-[15px] ${t.state === "next" ? "font-semibold text-[#8a93a5]" : "font-extrabold"}`}>
                  {t.label}
                  <span className="sr-only"> — {t.state === "done" ? "done" : t.state === "now" ? "now" : "not yet"}</span>
                </p>
              </div>
            ))}
          </section>
        )}

        <section className={`${card} px-4 py-1`}>
          {items.map((it) => (
            <div key={it.id} className="flex justify-between border-b border-[#eef0f4] py-3 text-sm last:border-0">
              <span>
                {it.quantity} × {[it.name, it.size].filter(Boolean).join(", ")}
              </span>
              <span className="font-bold">{naira(it.priceKobo * it.quantity)}</span>
            </div>
          ))}
          {o.deliveryFeeKobo > 0 && (
            <div className="flex justify-between border-b border-[#eef0f4] py-3 text-sm">
              <span>Delivery</span>
              <span className="font-bold">{naira(o.deliveryFeeKobo)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-base font-extrabold">
            <span>Total paid</span>
            <span>{naira(total)}</span>
          </div>
        </section>

        <section className={`${card} p-4 text-sm`}>
          <p className="font-bold">{where}</p>
          {o.method === "rider" && <p className="mt-1 text-[13px] text-muted">The seller will add the rider&apos;s details here on delivery day.</p>}
          {o.note && <p className="mt-2 text-[13px] text-muted">Your note: {o.note}</p>}
        </section>

        {open && (
          <>
            <Note>
              {hold ? (
                <>
                  <b>{naira(total)} is held safely.</b> The seller is paid only when you tap “I’ve received it”.
                </>
              ) : (
                <>
                  <b>Something wrong?</b> Report it within 48 hours of your delivery day.
                </>
              )}
            </Note>
            <form action={markReceived}>
              <input type="hidden" name="code" value={o.code} />
              <button type="submit" className="h-[54px] w-full rounded-2xl bg-ink text-[15px] font-bold text-white">
                I&apos;ve received it
              </button>
            </form>
          </>
        )}
        {o.status === "received" && <Note tone="green">You received this order. Thank you!</Note>}
      </div>
    </main>
  );
}
