import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { holdMode } from "@/lib/orders";
import { myShop } from "@/lib/shops";
import CopyLink from "@/components/copy-link";
import { BackBar } from "@/components/ui";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";
const PERIODS = { "7": { label: "7 days", days: 7 }, "30": { label: "30 days", days: 30 }, all: { label: "All time", days: 0 } } as const;
const PAID = ["held", "released"] as const;
const dayKey = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
const short = (key: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { ...opts, timeZone: "UTC" }).format(new Date(key + "T00:00:00Z"));

export default async function Sales({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const key = ((await searchParams).p ?? "30") as keyof typeof PERIODS;
  const period = PERIODS[key] ?? PERIODS["30"];
  const from = period.days ? new Date(Date.now() - period.days * 86400_000) : new Date(0);
  const inPeriod = and(eq(orders.shopId, shop.id), inArray(payments.status, [...PAID]), gte(payments.createdAt, from));

  const [[totals], daily, top, recent] = await Promise.all([
    db
      .select({
        earned: sql<number>`coalesce(sum(${payments.sellerKobo}), 0)::int`,
        paid: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::int`,
        sales: sql<number>`count(*)::int`,
        customers: sql<number>`count(distinct ${orders.buyerId})::int`,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(inPeriod),
    db
      .select({ at: payments.createdAt, earned: payments.sellerKobo })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(inPeriod, gte(payments.createdAt, new Date(Date.now() - (period.days || 365) * 86400_000)))),
    db
      .select({ name: orderItems.name, revenue: sql<number>`sum(${orderItems.priceKobo} * ${orderItems.quantity})::int`, sold: sql<number>`sum(${orderItems.quantity})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(inPeriod)
      .groupBy(orderItems.name)
      .orderBy(desc(sql`sum(${orderItems.priceKobo} * ${orderItems.quantity})`))
      .limit(5),
    db
      .select({ code: orders.code, at: payments.createdAt, amount: payments.sellerKobo, status: payments.status, buyer: users.name })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(and(eq(orders.shopId, shop.id), inArray(payments.status, ["held", "released", "refunded"])))
      .orderBy(desc(payments.createdAt))
      .limit(10),
  ]);

  // Bars: one a day for 7 or 30 days, one a month for all time.
  const monthly = !period.days;
  const buckets = new Map<string, number>();
  if (monthly) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - i);
      buckets.set(d.toISOString().slice(0, 7), 0);
    }
  } else {
    for (let i = period.days - 1; i >= 0; i--) buckets.set(dayKey(new Date(Date.now() - i * 86400_000)), 0);
  }
  for (const r of daily) {
    const k = monthly ? dayKey(r.at).slice(0, 7) : dayKey(r.at);
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + r.earned);
  }
  const bars = [...buckets];
  const peak = Math.max(1, ...bars.map(([, v]) => v));
  const site = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Sales" href="/shop/manage" />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          {Object.entries(PERIODS).map(([k, v]) => (
            <Link
              key={k}
              href={`/shop/manage/sales?p=${k}`}
              className={`flex h-10 flex-1 items-center justify-center rounded-full text-sm font-bold ${k === key ? "bg-ink text-white" : "text-muted"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <section className="rounded-[24px] bg-ink p-5 text-white">
          <p className="text-[13px] font-bold text-[#afc0ff]">You earned</p>
          <p className="text-[34px] font-extrabold leading-tight tracking-tight">{naira(totals.earned)}</p>
          <p className="text-[13px] text-[#c9d1e3]">After Vouchly&apos;s 5%. Buyers paid {naira(totals.paid)} in total.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              [totals.sales, totals.sales === 1 ? "sale" : "sales"],
              [totals.customers, totals.customers === 1 ? "customer" : "customers"],
              [totals.sales ? naira(Math.round(totals.paid / totals.sales)) : "–", "per sale"],
            ].map(([n, l]) => (
              <div key={String(l)} className="rounded-[14px] bg-white/10 py-2.5">
                <p className="text-lg font-extrabold">{n}</p>
                <p className="text-xs text-[#c9d1e3]">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} p-4`}>
          <p className="text-[15px] font-extrabold">{monthly ? "By month" : "By day"}</p>
          <div className="mt-3 flex h-[120px] items-end gap-[3px]" role="img" aria-label={`Earnings ${monthly ? "by month" : "by day"}`}>
            {bars.map(([k, v]) => (
              <div key={k} className="flex h-full flex-1 flex-col justify-end" title={`${k}: ${naira(v)}`}>
                <div className={`rounded-t-[4px] ${v ? "bg-accent" : "bg-[#e6e9ef]"}`} style={{ height: `${Math.max(v ? 6 : 3, (v / peak) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{monthly ? short(bars[0][0] + "-01", { month: "short" }) : short(bars[0][0], { day: "numeric", month: "short" })}</span>
            <span>{monthly ? "This month" : "Today"}</span>
          </div>
        </section>

        <section className={`${card} px-4 py-1`}>
          <p className="pt-3 text-[15px] font-extrabold">Top sellers</p>
          {top.length === 0 && <p className="py-3 text-sm text-muted">No sales in this time yet.</p>}
          {top.map((t, i) => (
            <div key={t.name} className="flex items-center gap-3 border-b border-[#eef0f4] py-3 text-sm last:border-0">
              <span className="flex size-7 items-center justify-center rounded-full bg-soft text-xs font-extrabold text-deep">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
              <span className="text-muted">{t.sold} sold</span>
              <span className="font-bold">{naira(t.revenue)}</span>
            </div>
          ))}
        </section>

        <section className="rounded-[20px] bg-soft p-4">
          <p className="text-[15px] font-extrabold text-ink">Share your shop</p>
          <p className="mb-2.5 mt-0.5 text-[13px] text-deep">Anyone can buy from this link, even without an account. Put it on your WhatsApp status or Instagram bio.</p>
          <CopyLink url={`${site}/s/${shop.slug}`} text={`Shop with me on Vouchly: ${shop.name}`} />
        </section>

        <section className={`${card} p-4 text-sm`}>
          <p className="text-[15px] font-extrabold">Payouts</p>
          <p className="mt-1 text-muted">
            {shop.paystackSubaccount
              ? holdMode()
                ? `Your money is released to ${shop.payoutBank} ···· ${shop.payoutAccountLast4} once the buyer confirms, or 48 hours after the day.`
                : `Paystack pays you straight into ${shop.payoutBank} ···· ${shop.payoutAccountLast4}, usually the next working day.`
              : "Add your bank account so you can get paid."}
          </p>
          {!shop.paystackSubaccount && (
            <Link href="/shop/manage/payout" className="mt-2 inline-block font-bold text-accent">
              Add bank account
            </Link>
          )}
        </section>

        <section className={`${card} px-4 py-1`}>
          <p className="pt-3 text-[15px] font-extrabold">Latest payments</p>
          {recent.length === 0 && <p className="py-3 text-sm text-muted">Payments will show here.</p>}
          {recent.map((r) => (
            <Link key={r.code} href={`/shop/manage/orders/${r.code}`} className="flex items-center gap-3 border-b border-[#eef0f4] py-3 text-sm last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.buyer}</span>
                <span className="block text-xs text-muted">
                  {r.code}, {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(r.at)}
                </span>
              </span>
              <span className={`font-bold ${r.status === "refunded" ? "text-muted line-through" : ""}`}>{naira(r.amount)}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
