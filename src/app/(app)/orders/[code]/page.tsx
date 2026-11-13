import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  deliverySettings,
  orderItems,
  orders,
  payments,
  products,
  reviews,
  shops,
  users,
} from "@/db/schema";
import { requireBuyer } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { maybeSettle } from "@/lib/after-order";
import {
  deliveryDayLabel,
  holdMode,
  orderDeadline,
  problemDeadline,
  shortDateTime,
  telLink,
  waLink,
} from "@/lib/orders";
import { statusLabel, timeline } from "@/lib/order-status";
import { dateToKey, nightsBetween, shortDay } from "@/lib/dates";
import { slotLabel, timeLabel } from "@/lib/listings";
import { dropRequest } from "@/app/(app)/book/actions";
import PayQuote from "./pay-quote";
import { BackBar, Note } from "@/components/ui";
import SaveLink from "@/components/save-link";
import { markReceived } from "../actions";
import { CancelForm, ProblemForm, ReviewForm } from "./forms";
import Photo from "@/components/photo";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireBuyer();
  const { code } = await params;
  const { placed } = await searchParams;
  await maybeSettle();
  const [row] = await db
    .select({ order: orders, shop: shops, sellerPhone: users.phone })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id)))
    .limit(1);
  if (!row) notFound();
  const { order: o, shop, sellerPhone } = row;
  const [items, [d], [review], [refunded]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db
      .select()
      .from(deliverySettings)
      .where(eq(deliverySettings.shopId, shop.id))
      .limit(1),
    db.select().from(reviews).where(eq(reviews.orderId, o.id)).limit(1),
    db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, o.id), eq(payments.status, "refunded")))
      .limit(1),
  ]);
  const cancelledPaid = !!refunded;
  const now = new Date();
  const stay = o.method === "check_in";
  const visit = o.method === "visit";
  const digital = o.method === "download";
  const canDownload = digital && ["received", "disputed"].includes(o.status);
  const booking = stay || visit;
  // Full address and check-in details show once the host has sent them.
  const [listing] =
    stay && items[0] && ["ready", "received", "disputed"].includes(o.status)
      ? await db
          .select()
          .from(products)
          .where(eq(products.id, items[0].productId))
          .limit(1)
      : [];
  const cancelBy = booking
    ? o.deliveryDay
    : d
      ? orderDeadline(o.deliveryDay, d.orderCutoff)
      : null;
  const canCancel = o.status === "paid" && !!cancelBy && now < cancelBy;
  const reportBy = problemDeadline(o.deliveryDay);
  const canReport =
    [
      "paid",
      "confirmed",
      "preparing",
      "ready",
      "on_the_way",
      "received",
    ].includes(o.status) && now < reportBy;
  const hi = `Hi, it's about my Vouchly order ${o.code}.`;
  const total = o.itemsKobo + o.deliveryFeeKobo;
  const s = { label: statusLabel(o.status, o.method) };
  const open = [
    "paid",
    "confirmed",
    "preparing",
    "ready",
    "on_the_way",
  ].includes(o.status);
  const nights =
    stay && o.checkOut
      ? nightsBetween(dateToKey(o.deliveryDay), dateToKey(o.checkOut))
      : 0;
  const dayText =
    stay && o.checkOut
      ? `${shortDay(dateToKey(o.deliveryDay))} → ${shortDay(dateToKey(o.checkOut))}`
      : deliveryDayLabel(o.deliveryDay);
  const doneLabel = stay
    ? "I've checked in"
    : visit
      ? "The job is done"
      : "I've received it";
  const hold = holdMode();
  const where = digital
    ? "Digital download"
    : stay
      ? `Stay in ${shop.area} · ${nights} ${nights === 1 ? "night" : "nights"}${o.guests ? ` · ${o.guests} ${o.guests === 1 ? "guest" : "guests"}` : ""}`
      : visit
        ? `Visit: ${deliveryDayLabel(o.deliveryDay)}, ${slotLabel(o.timeSlot)} · ${o.address}`
        : o.method === "pickup"
          ? `Pickup: ${[d?.pickupSpot, d?.pickupHours].filter(Boolean).join(" · ") || shop.area}`
          : o.method === "drop_off"
            ? `Seller drops it off: ${o.address}`
            : `Rider to: ${o.address}`;

  // Guests open their order through a private link.
  const saveUrl =
    user.isGuest && o.accessToken
      ? `${process.env.SITE_URL ?? "https://vouchly-af24.onrender.com"}/o/${o.accessToken}`
      : null;

  if (placed && o.status !== "awaiting_payment") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col">
        <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-20 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-[#ddf3e4]">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#1b6b3a]">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.8"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </span>
          <h1 className="text-[28px] font-extrabold tracking-tight">
            {o.status === "requested"
              ? "Request sent!"
              : digital
                ? "It's yours!"
                : booking
                  ? "Booked!"
                  : "Order placed!"}
          </h1>
          <p className="text-[15px] leading-relaxed text-muted">
            {digital
              ? `${total ? `You paid ${naira(total)}. ` : ""}Download it now, or any time from your orders.`
              : o.status === "requested"
                ? `${shop.name} will look at your request and send you a price. You only pay if you accept it.`
                : hold
                  ? `${naira(total)} is held safely until ${stay ? "you check in" : visit ? "the job is done" : "you receive your order"}.`
                  : stay
                    ? `You paid ${naira(total)}. ${shop.name} will accept your booking and send check-in details.`
                    : visit
                      ? `You paid ${naira(total)}. ${shop.name} will confirm the visit.`
                      : `You paid ${naira(total)}. ${shop.name} will have it ready on ${deliveryDayLabel(o.deliveryDay)}.`}
          </p>
          <section className={`${card} w-full p-4 text-left`}>
            {[
              ["Order", o.code],
              ["From", shop.name],
              [
                stay
                  ? "Dates"
                  : visit
                    ? "Visit"
                    : digital
                      ? "Bought"
                      : "Delivery day",
                stay
                  ? dayText
                  : visit
                    ? `${deliveryDayLabel(o.deliveryDay)}, ${slotLabel(o.timeSlot)}`
                    : deliveryDayLabel(o.deliveryDay),
              ],
              ...(visit || digital ? [] : [["How", where]]),
            ].map(([a, b]) => (
              <div
                key={a}
                className="flex justify-between gap-4 py-1.5 text-sm"
              >
                <span className="text-muted">{a}</span>
                <span className="text-right font-semibold">{b}</span>
              </div>
            ))}
          </section>
          {saveUrl && <SaveLink url={saveUrl} code={o.code} />}
        </div>
        <div className="flex flex-col gap-2.5 px-4 pb-8 pt-6">
          {canDownload && (
            <a
              href={`/api/download/${o.code}`}
              className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-white"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
              Download {items[0]?.name}
            </a>
          )}
          <Link
            href={`/orders/${o.code}`}
            className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white"
          >
            {booking ? "See my booking" : "Track my order"}
          </Link>
          <Link
            href={user.isGuest ? "/orders" : "/home"}
            className="flex h-[54px] items-center justify-center rounded-2xl border border-[#d5dae4] bg-white text-[15px] font-bold"
          >
            {user.isGuest ? "My orders" : "Back to home"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title={`Order ${o.code}`} href="/orders" />
      <div className="flex flex-col gap-4 px-4">
        {saveUrl && <SaveLink url={saveUrl} code={o.code} />}
        <section className="flex items-center gap-3.5 rounded-[20px] bg-ink p-4 text-white">
          <span className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-deep">
            {shop.coverPhoto && <Photo src={shop.coverPhoto} sizes="56px" />}
          </span>
          <div>
            <p className="text-lg font-extrabold">{s.label}</p>
            <p className="text-[13px] text-[#c9d1e3]">
              {shop.name} · {dayText}
            </p>
          </div>
        </section>

        {o.status === "awaiting_payment" && (
          <Note tone="amber">
            This order wasn&apos;t paid, so the seller hasn&apos;t seen it.
          </Note>
        )}

        {!digital &&
          ![
            "awaiting_payment",
            "cancelled",
            "disputed",
            "requested",
            "quoted",
          ].includes(o.status) && (
            <section className={`${card} p-4`}>
              {timeline(o.status, o.method).map((t, i, all) => (
                <div key={t.key} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        t.state === "done"
                          ? "bg-[#1b6b3a] text-white"
                          : t.state === "now"
                            ? "bg-ink text-white"
                            : "border-2 border-[#c8ceda]"
                      }`}
                      aria-hidden="true"
                    >
                      {t.state === "done" ? "✓" : t.state === "now" ? "•" : ""}
                    </span>
                    {i < all.length - 1 && (
                      <span
                        className={`h-7 w-0.5 ${t.state === "done" ? "bg-[#1b6b3a]" : "bg-[#e3e6ec]"}`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-[15px] ${t.state === "next" ? "font-semibold text-[#8a93a5]" : "font-extrabold"}`}
                  >
                    {t.label}
                    <span className="sr-only">
                      {" "}
                      —{" "}
                      {t.state === "done"
                        ? "done"
                        : t.state === "now"
                          ? "now"
                          : "not yet"}
                    </span>
                  </p>
                </div>
              ))}
            </section>
          )}

        <section className={`${card} px-4 py-1`}>
          {o.status === "requested" && (
            <p className="border-b border-[#eef0f4] py-3 text-sm">
              {items[0]?.name}{" "}
              <span className="text-muted">· waiting for a price</span>
            </p>
          )}
          {o.status !== "requested" &&
            items.map((it) => (
              <div
                key={it.id}
                className="flex justify-between border-b border-[#eef0f4] py-3 text-sm last:border-0"
              >
                <span>
                  {booking
                    ? [it.name, stay ? it.size : null]
                        .filter(Boolean)
                        .join(" · ")
                    : `${it.quantity} × ${[it.name, it.size].filter(Boolean).join(", ")}`}
                </span>
                <span className="font-bold">
                  {naira(it.priceKobo * it.quantity)}
                </span>
              </div>
            ))}
          {o.deliveryFeeKobo > 0 && (
            <div className="flex justify-between border-b border-[#eef0f4] py-3 text-sm">
              <span>Delivery</span>
              <span className="font-bold">{naira(o.deliveryFeeKobo)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-base font-extrabold">
            <span>
              {["requested", "quoted"].includes(o.status)
                ? "Total"
                : "Total paid"}
            </span>
            <span>{naira(total)}</span>
          </div>
        </section>

        <section className={`${card} p-4 text-sm`}>
          <p className="font-bold">{where}</p>
          {o.method === "rider" && !o.riderName && (
            <p className="mt-1 text-[13px] text-muted">
              The seller will add the rider&apos;s details here on delivery day.
            </p>
          )}
          {stay && <p className="mt-1 text-[13px] text-muted">{dayText}</p>}
          {o.note && (
            <p className="mt-2 whitespace-pre-line text-[13px] text-muted">
              {visit ? "The job" : "Your note"}: {o.note}
            </p>
          )}
          {o.status !== "cancelled" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={telLink(sellerPhone)}
                className="flex h-11 items-center justify-center rounded-full border border-[#d5dae4] font-bold"
              >
                Call seller
              </a>
              <a
                href={waLink(sellerPhone, hi)}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-full border border-[#d5dae4] font-bold"
              >
                WhatsApp
              </a>
            </div>
          )}
        </section>

        {o.riderName && o.status === "on_the_way" && (
          <section className="rounded-[20px] bg-soft p-4 text-sm">
            <p className="text-xs font-bold text-deep">Your rider</p>
            <p className="text-[17px] font-extrabold">{o.riderName}</p>
            {o.riderCostKobo ? (
              <p className="mt-0.5">
                Pay the rider {naira(o.riderCostKobo)} when it arrives.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {o.riderPhone && (
                <a
                  href={telLink(o.riderPhone)}
                  className="flex h-10 items-center rounded-full bg-white px-4 font-bold"
                >
                  Call rider
                </a>
              )}
              {o.riderTrackingUrl && (
                <a
                  href={o.riderTrackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center rounded-full bg-ink px-4 font-bold text-white"
                >
                  Track the ride
                </a>
              )}
            </div>
          </section>
        )}

        {o.status === "requested" && (
          <>
            <Note>
              We&apos;ll let you know when {shop.name} sends a price. You can
              call or WhatsApp them too.
            </Note>
            <form action={dropRequest}>
              <input type="hidden" name="code" value={o.code} />
              <SubmitButton className="h-12 w-full rounded-2xl text-[15px] font-bold text-[#b42318]">
                Cancel request
              </SubmitButton>
            </form>
          </>
        )}
        {o.status === "quoted" && (
          <section className="rounded-[20px] bg-soft p-4">
            <p className="text-xs font-bold text-deep">
              {shop.name}&apos;s price
            </p>
            <p className="text-[26px] font-extrabold">{naira(o.itemsKobo)}</p>
            {o.quoteNote && (
              <p className="mt-1 whitespace-pre-line text-[13px] text-[#3a4458]">
                {o.quoteNote}
              </p>
            )}
            <div className="mt-3">
              <PayQuote
                code={o.code}
                label={`Accept and pay ${naira(o.itemsKobo)}`}
              />
            </div>
            <form action={dropRequest} className="mt-2">
              <input type="hidden" name="code" value={o.code} />
              <SubmitButton className="h-11 w-full text-sm font-bold text-[#b42318]">
                No thanks
              </SubmitButton>
            </form>
          </section>
        )}
        {canDownload && (
          <a
            href={`/api/download/${o.code}`}
            className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Download {items[0]?.name}
          </a>
        )}
        {stay &&
          o.checkInInfo &&
          ["ready", "received", "disputed"].includes(o.status) && (
            <section className="rounded-[20px] bg-soft p-4 text-sm">
              <p className="text-xs font-bold text-deep">Check-in details</p>
              {listing?.privateAddress && (
                <p className="mt-1 text-[15px] font-extrabold">
                  {listing.privateAddress}
                </p>
              )}
              <p className="mt-1.5 whitespace-pre-line leading-relaxed">
                {o.checkInInfo}
              </p>
              {listing && (
                <p className="mt-2 text-[13px] text-[#3a4458]">
                  Check in from {timeLabel(listing.checkInTime) || "2pm"} ·
                  check out by {timeLabel(listing.checkOutTime) || "12pm"}
                </p>
              )}
            </section>
          )}

        {o.status === "disputed" && (
          <div className="rounded-[18px] bg-[#fbebeb] px-4 py-3.5 text-[13px] leading-relaxed text-[#5c1a12]">
            <p className="font-bold">You reported a problem</p>
            <p className="mt-1">{o.problem}</p>
            <p className="mt-1.5">
              {shop.name} has been told. If you can&apos;t sort it out together,
              Vouchly will step in.
            </p>
          </div>
        )}
        {o.status === "cancelled" && (
          <Note tone="amber">
            This {booking ? "booking" : "order"} was cancelled
            {o.cancelReason ? `: ${o.cancelReason}` : ""}.
            {cancelledPaid ? " Your money has been refunded." : ""}
          </Note>
        )}
        {o.problemResolution && o.status !== "disputed" && (
          <Note>{o.problemResolution}</Note>
        )}

        {open && (
          <>
            <Note>
              {hold ? (
                <>
                  <b>{naira(total)} is held safely.</b> The seller is paid only
                  when you tap “{doneLabel}”.
                </>
              ) : stay ? (
                <>
                  Tap the button below once you&apos;ve checked in, so{" "}
                  {shop.name} knows you arrived.
                </>
              ) : visit ? (
                <>Tap the button below once the job is done.</>
              ) : (
                <>
                  Tap the button below once you have your order, so {shop.name}{" "}
                  knows it arrived.
                </>
              )}
            </Note>
            <form action={markReceived}>
              <input type="hidden" name="code" value={o.code} />
              <SubmitButton className="h-[54px] w-full rounded-2xl bg-ink text-[15px] font-bold text-white">
                {doneLabel}
              </SubmitButton>
            </form>
          </>
        )}
        {o.status === "received" && (
          <Note tone="green">
            {o.autoClosed
              ? `This ${booking ? "booking" : "order"} closed because no problem was reported.`
              : digital
                ? "Thanks for your purchase! It stays here for you to download again."
                : stay
                  ? "Enjoy your stay!"
                  : visit
                    ? "The job is done. Thank you!"
                    : "You received this order. Thank you!"}
          </Note>
        )}
        {canCancel && cancelBy && (
          <CancelForm code={o.code} until={shortDateTime(cancelBy)} />
        )}
        {canReport && (
          <ProblemForm code={o.code} until={shortDateTime(reportBy)} />
        )}
        {o.status === "received" &&
          (review ? (
            <section className={`${card} p-4 text-sm`}>
              <p className="text-xs font-bold text-muted">Your review</p>
              <p
                className="text-lg text-[#e9a23b]"
                aria-label={`${review.stars} stars`}
              >
                {"★".repeat(review.stars)}
                <span className="text-[#c8ceda]">
                  {"★".repeat(5 - review.stars)}
                </span>
              </p>
              {review.tags.length > 0 && (
                <p className="text-[13px] font-semibold">
                  {review.tags.join(" · ")}
                </p>
              )}
              {review.text && <p className="mt-1 text-muted">{review.text}</p>}
            </section>
          ) : (
            <ReviewForm code={o.code} shopName={shop.name} />
          ))}
      </div>
    </main>
  );
}
