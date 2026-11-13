import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, payments, products, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel, holdMode, problemDeadline, shortDateTime, telLink, waLink } from "@/lib/orders";
import { PROBLEMS, SELLER_STATUS, sellerNext, statusLabel, TONE } from "@/lib/order-status";
import { dateToKey, nightsBetween, shortDay } from "@/lib/dates";
import { eventWhen, slotLabel } from "@/lib/listings";
import { myShop } from "@/lib/shops";
import { BackBar, Note } from "@/components/ui";
import { advanceOrder } from "../actions";
import { CheckInForm, DeclineForm, QuoteForm, RefundForm, RiderForm } from "./forms";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";
const METHOD = { pickup: "Buyer picks up", drop_off: "You drop it off", rider: "Send with a rider", check_in: "Stay", visit: "Visit", download: "Digital download", session: "Session", event: "Event tickets" } as const;

export default async function SellerOrder({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { code } = await params;
  const [row] = await db
    .select({ order: orders, buyer: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orders.code, code), eq(orders.shopId, shop.id)))
    .limit(1);
  if (!row || row.order.status === "awaiting_payment") notFound();
  const { order: o, buyer } = row;
  const [items, [d], pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)),
  ]);
  // The payment that went through, if any.
  const pay = pays.find((p) => p.status !== "pending") ?? null;
  const fee = pay?.feeKobo ?? Math.round(o.itemsKobo * 0.05);
  const youGet = pay?.sellerKobo ?? o.itemsKobo + o.deliveryFeeKobo - fee;
  const [listing] = ["check_in", "session", "event"].includes(o.method) && items[0] ? await db.select().from(products).where(eq(products.id, items[0].productId)).limit(1) : [];
  const s = { label: statusLabel(o.status, o.method, true), tone: SELLER_STATUS[o.status].tone };
  const next = sellerNext(o.status, o.method);
  const canRefund = ["paid", "confirmed", "preparing", "ready", "on_the_way", "disputed"].includes(o.status);
  const problemLabel = o.problem ? (PROBLEMS.find((p) => o.problem!.startsWith(p.label))?.label ?? "Problem") : null;
  const hi = `Hi ${buyer.name.split(" ")[0]}, it's ${shop.name} on Vouchly about order ${o.code}.`;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title={`Order ${o.code}`} href="/shop/manage/orders" />
      <div className="flex flex-col gap-4 px-4">
        <section className={`${card} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold">{buyer.name}</p>
              <p className="text-[13px] text-muted">{buyer.ward}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={telLink(buyer.phone)} className="flex h-11 items-center justify-center rounded-full border border-[#d5dae4] text-sm font-bold">
              Call
            </a>
            <a href={waLink(buyer.phone, hi)} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-full border border-[#d5dae4] text-sm font-bold">
              WhatsApp
            </a>
          </div>
        </section>

        {o.status === "disputed" && (
          <div className="rounded-[18px] bg-[#fbebeb] px-4 py-3.5 text-[13px] leading-relaxed text-[#5c1a12]">
            <p className="font-bold">The buyer reported a problem{problemLabel ? `: ${problemLabel}` : ""}</p>
            <p className="mt-1">{o.problem}</p>
            <p className="mt-1.5">Talk to the buyer first. If you agree, refund them below. If you can&apos;t agree, Vouchly will help.</p>
          </div>
        )}
        {o.status === "cancelled" && <Note tone="amber">Cancelled and refunded{o.cancelReason ? `: ${o.cancelReason}` : "."}</Note>}
        {o.status === "received" && (
          <Note tone="green">{o.autoClosed ? "Closed — no problem was reported within 48 hours." : "The buyer received this order."}</Note>
        )}

        <section className={`${card} px-4 py-1`}>
          {o.status === "requested" && <p className="border-b border-[#eef0f4] py-3 text-sm text-muted">No price yet. Send one below.</p>}
          {o.status !== "requested" && items.map((it) => (
            <div key={it.id} className="flex justify-between border-b border-[#eef0f4] py-3 text-sm">
              <span>
                {o.method === "check_in"
                  ? [it.name, it.size].filter(Boolean).join(" · ")
                  : o.method === "visit"
                    ? it.name
                    : `${it.quantity} × ${[it.name, it.size].filter(Boolean).join(", ")}`}
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
          <div className="flex justify-between border-b border-[#eef0f4] py-3 text-sm text-muted">
            <span>Vouchly 5%</span>
            <span>−{naira(fee)}</span>
          </div>
          <div className="flex justify-between py-3 text-base font-extrabold">
            <span>{pay ? "You get" : "You'd get"}</span>
            <span>{naira(youGet)}</span>
          </div>
        </section>

        <section className={`${card} p-4 text-sm`}>
          {o.method === "check_in" && o.checkOut ? (
            <>
              <p className="text-[13px] font-bold text-muted">Stay</p>
              <p className="mt-1 font-bold">
                {shortDay(dateToKey(o.deliveryDay))} → {shortDay(dateToKey(o.checkOut))} · {nightsBetween(dateToKey(o.deliveryDay), dateToKey(o.checkOut))} nights
                {o.guests ? ` · ${o.guests} ${o.guests === 1 ? "guest" : "guests"}` : ""}
              </p>
              {o.checkInInfo && <p className="mt-2 whitespace-pre-line rounded-[14px] bg-soft px-3 py-2.5 text-[13px]">You sent: {o.checkInInfo}</p>}
            </>
          ) : o.method === "session" || o.method === "event" ? (
            <>
              <p className="text-[13px] font-bold text-muted">{o.method === "session" ? "Session" : `Event · ticket code ${o.code}`}</p>
              <p className="mt-1 font-bold">{eventWhen(o.deliveryDay)}</p>
              {listing && <p className="mt-0.5 text-muted">{listing.online ? "Online" : listing.privateAddress}</p>}
            </>
          ) : o.method === "download" ? (
            <>
              <p className="text-[13px] font-bold text-muted">Digital download</p>
              <p className="mt-1 font-bold">
                Bought {deliveryDayLabel(o.deliveryDay)} · downloaded {o.downloads} {o.downloads === 1 ? "time" : "times"}
              </p>
            </>
          ) : o.method === "visit" ? (
            <>
              <p className="text-[13px] font-bold text-muted">Visit</p>
              <p className="mt-1 font-bold">
                {deliveryDayLabel(o.deliveryDay)} · {slotLabel(o.timeSlot)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-bold text-muted">{deliveryDayLabel(o.deliveryDay)}</p>
              <p className="mt-1 font-bold">{METHOD[o.method]}</p>
            </>
          )}
          {o.method === "pickup" && d?.pickupSpot && <p className="mt-0.5 text-muted">At {[d.pickupSpot, d.pickupHours].filter(Boolean).join(" · ")}</p>}
          {o.address && <p className="mt-0.5">{o.address}</p>}
          {o.note && (
            <p className="mt-2 whitespace-pre-line text-[13px] text-muted">
              {o.method === "visit" ? "The job" : "Buyer's note"}: {o.note}
            </p>
          )}
          {o.riderName && (
            <p className="mt-2 text-[13px]">
              Rider: <b>{o.riderName}</b> · 0{o.riderPhone?.slice(3)}
              {o.riderCostKobo ? ` · buyer pays ${naira(o.riderCostKobo)}` : ""}
            </p>
          )}
        </section>

        {o.status === "quoted" && (
          <Note>
            You sent a price of <b>{naira(o.itemsKobo)}</b>. Waiting for {buyer.name.split(" ")[0]} to pay.
          </Note>
        )}
        {["requested", "quoted"].includes(o.status) && (
          <>
            <QuoteForm code={o.code} again={o.status === "quoted"} />
            <DeclineForm code={o.code} />
          </>
        )}
        {next?.form === "checkin" && (
          <CheckInForm code={o.code} address={listing?.privateAddress ?? null} session={o.method === "session"} link={listing?.meetingLink ?? null} />
        )}
        {o.method === "event" && listing && (
          <Link href={`/shop/manage/products/${listing.id}/attendees`} className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white">
            See everyone coming
          </Link>
        )}
        {next && !next.form && (
          <form action={advanceOrder}>
            <input type="hidden" name="code" value={o.code} />
            <input type="hidden" name="to" value={next.to} />
            <SubmitButton className="h-[54px] w-full rounded-2xl bg-ink text-[15px] font-bold text-white">
              {next.label}
            </SubmitButton>
          </form>
        )}
        {(next?.form === "rider" || (o.method === "rider" && o.status === "confirmed")) && <RiderForm code={o.code} estimate={d?.riderEstimate ?? undefined} />}
        {o.status === "confirmed" && o.method === "rider" && (
          <p className="-mt-2 px-1 text-xs text-muted">Or tap “Start getting it ready” first if it isn&apos;t ready yet.</p>
        )}
        {(o.method === "visit" ? o.status === "ready" : ["ready", "on_the_way"].includes(o.status)) && (
          <Note>
            {o.method === "check_in"
              ? "Waiting for the guest to tap “I've checked in”."
              : o.method === "visit"
                ? "Waiting for the customer to confirm the job is done."
                : "Waiting for the buyer to tap “I've received it”."} If they don&apos;t report a problem by {shortDateTime(problemDeadline(o.deliveryDay))}, it closes by itself.
            {holdMode() ? " Then your money is released." : ""}
          </Note>
        )}
        {canRefund && <RefundForm code={o.code} problem={o.status === "disputed"} />}
      </div>
    </main>
  );
}
