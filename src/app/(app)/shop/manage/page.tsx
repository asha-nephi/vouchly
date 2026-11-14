import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orderItems, orders, payments, products, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cutoffLabel, dayList, naira } from "@/lib/catalog";
import { myShop } from "@/lib/shops";
import { toggleShopOpen } from "../actions";
import { Note } from "@/components/ui";
import TabBar from "@/components/tab-bar";
import TilePhoto from "@/components/tile-photo";
import { eventWhen, listingLine, priceText } from "@/lib/listings";
import { sellerNext, statusLabel, TO_DO } from "@/lib/order-status";
import { deliveryDayLabel } from "@/lib/orders";
import SubmitButton from "@/components/submit-button";
import TodoButton from "./todo-button";
import { shopStats } from "@/lib/shop-stats";
import { slotLabel } from "@/lib/listings";
import { aiReady } from "@/lib/ai";
import PostMaker from "@/components/post-maker";

export const dynamic = "force-dynamic";

const card = "rounded-[18px] border border-line bg-white";
const SOLD = ["paid", "confirmed", "preparing", "ready", "on_the_way", "received", "disputed"] as const;
const DAY = 86400_000;
// Short button words, so the order text keeps its room.
const SHORT: Record<string, string> = {
  "Confirm order": "Accept",
  "Accept booking": "Accept",
  "Accept job": "Accept",
  "Start getting it ready": "Start",
  "It's ready for pickup": "Mark ready",
  "I'm on my way": "On my way",
  "Send with a rider": "Send rider",
  "Send check-in details": "Send details",
  "Send meeting details": "Send details",
};
const short = (label: string) => SHORT[label] ?? label;
const lagosKey = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10); // Lagos is UTC+1

export default async function MyShop({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { saved } = await searchParams;
  const ai = aiReady();
  const weekAgo = new Date(Date.now() - 7 * DAY);

  const [items, [delivery], weekPay, open, perProduct, stats, latestPay, [weekJobs]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
    // Money in over the last 7 days, after Vouchly's 5%.
    db
      .select({ at: payments.createdAt, earned: payments.sellerKobo })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(eq(orders.shopId, shop.id), inArray(payments.status, ["held", "released"]), gte(payments.createdAt, weekAgo))),
    // Open orders, soonest first, with the buyer and what they ordered.
    db
      .select({
        code: orders.code,
        status: orders.status,
        method: orders.method,
        day: orders.deliveryDay,
        slot: orders.timeSlot,
        buyer: users.name,
        guest: users.isGuest,
        first: sql<string>`(array_agg(${orderItems.name} order by ${orderItems.id}))[1]`,
        lines: sql<number>`count(${orderItems.id})::int`,
        qty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerId))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.shopId, shop.id), inArray(orders.status, [...TO_DO])))
      .groupBy(orders.id, users.name, users.isGuest)
      .orderBy(asc(orders.deliveryDay)),
    // How each listing is doing.
    db
      .select({
        id: orderItems.productId,
        week: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.createdAt} >= ${weekAgo.toISOString()}::timestamptz), 0)::int`,
        all: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        downloads: sql<number>`coalesce(sum(${orders.downloads}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.shopId, shop.id), inArray(orders.status, [...SOLD])))
      .groupBy(orderItems.productId),
    shopStats(shop.id),
    // Latest payments, for the table on computers.
    db
      .select({
        at: payments.createdAt,
        paid: payments.amountKobo,
        net: payments.sellerKobo,
        code: orders.code,
        buyer: users.name,
        guest: users.isGuest,
        first: sql<string | null>`(select oi.name from ${orderItems} oi where oi.order_id = ${orders.id} order by oi.id limit 1)`,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(and(eq(orders.shopId, shop.id), inArray(payments.status, ["held", "released", "part_refunded"])))
      .orderBy(desc(payments.createdAt))
      .limit(6),
    // Orders and bookings made in the last 7 days.
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.shopId, shop.id), inArray(orders.status, [...SOLD]), gte(orders.createdAt, weekAgo))),
  ]);

  // The last 7 Lagos days, oldest first; today is last.
  const todayKey = lagosKey(new Date());
  const days = Array.from({ length: 7 }, (_, i) => lagosKey(new Date(Date.now() - (6 - i) * DAY)));
  const byDay = Object.fromEntries(days.map((k) => [k, 0]));
  for (const p of weekPay) {
    const k = lagosKey(p.at);
    if (k in byDay) byDay[k] += p.earned;
  }
  const earned = weekPay.reduce((s, p) => s + p.earned, 0);
  const top = Math.max(...Object.values(byDay), 1);
  const dayLetter = (k: string) => new Intl.DateTimeFormat("en-NG", { weekday: "narrow", timeZone: "UTC" }).format(new Date(k + "T00:00:00Z"));
  const dayName = (k: string) => new Intl.DateTimeFormat("en-NG", { weekday: "long", timeZone: "UTC" }).format(new Date(k + "T00:00:00Z"));

  // Orders waiting on the seller: a next step, a price to send, or a problem to look at.
  const todo = open.map((o) => ({ ...o, next: sellerNext(o.status, o.method) })).filter((o) => o.next || o.status === "requested" || o.status === "disputed");
  const shown = todo.slice(0, 5);
  const what = (o: (typeof todo)[number]) => {
    const thing = o.lines > 1 ? `${o.qty} items` : ["pickup", "drop_off", "rider"].includes(o.method) ? `${o.first ?? "Order"} × ${o.qty}` : (o.first ?? "Order");
    if (o.status === "requested") return `Price request · ${thing}`;
    if (o.status === "disputed") return `Problem reported · ${thing}`;
    return `${statusLabel(o.status, o.method, true)} · ${thing}`;
  };

  const stat = new Map(perProduct.map((p) => [p.id, p]));
  const statusLine = (p: (typeof items)[number]) => {
    const s = stat.get(p.id);
    if (p.kind === "item") return [p.sellMode === "preorder" ? "Pre-order" : "In stock", s?.week ? `${s.week} sold this week` : "No sales this week"].join(" · ");
    if (p.kind === "event") return [eventWhen(p.eventAt).split(",").slice(0, -1).join(",") || "Event", p.seats ? `${s?.all ?? 0} of ${p.seats} seats taken` : `${s?.all ?? 0} going`].join(" · ");
    if (p.kind === "digital") return [p.fileName?.split(".").pop()?.toUpperCase() || "Download", `${s?.downloads ?? 0} ${s?.downloads === 1 ? "download" : "downloads"}`].join(" · ");
    return [listingLine(p).split(" · ")[0], s?.week ? `${s.week} booked this week` : "No bookings this week"].join(" · ");
  };

  // Computers: the week ahead, from open orders.
  const weekEnd = Date.now() + 7 * DAY;
  const week = open.filter((o) => o.day.getTime() >= Date.now() - DAY && o.day.getTime() < weekEnd).slice(0, 6);
  const type = shop.sellerType;
  const jobsWord = type === "service" ? "Jobs" : type === "online" ? "Sales" : "Orders";
  const first = user.name.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const shortDate = (d: Date) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);
  const dayParts = (d: Date) => ({
    w: new Intl.DateTimeFormat("en-NG", { weekday: "short", timeZone: "Africa/Lagos" }).format(d).toUpperCase(),
    n: new Intl.DateTimeFormat("en-NG", { day: "numeric", timeZone: "Africa/Lagos" }).format(d),
  });
  const visitWord = (n: number) => (type === "service" ? (n === 1 ? "visit" : "visits") : type === "online" ? (n === 1 ? "booking" : "bookings") : n === 1 ? "order" : "orders");
  const kpis = [
    { label: "Earned this week", value: naira(earned), sub: "After the 5% fee", tone: "text-muted" },
    { label: `${jobsWord} this week`, value: String(weekJobs?.n ?? 0), sub: weekPay.length ? `${weekPay.length} paid` : "None paid yet", tone: "text-muted" },
    { label: "Waiting on you", value: String(todo.length), sub: todo.length ? "Answer within a day" : "All caught up", tone: todo.length ? "text-[#B42318]" : "text-muted" },
    {
      label: "Rating",
      value: stats.rating !== null ? `★ ${stats.rating.toFixed(1)}` : "–",
      sub: stats.reviews ? `${stats.reviews} ${stats.reviews === 1 ? "review" : "reviews"}` : "No reviews yet",
      tone: "text-muted",
    },
  ];

  const link = `${process.env.SITE_URL ?? "https://vouchly-af24.onrender.com"}/s/${shop.slug}`;
  const ways = delivery ? [delivery.pickupOn && "Pickup", delivery.dropOffOn && "Drop-off", delivery.riderOn && "Rider"].filter(Boolean).join(" · ") : "";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28 lg:mx-0 lg:max-w-[1164px] lg:px-8 lg:pb-12 lg:pt-7">
      <header className="mb-[22px] hidden flex-wrap items-center justify-between gap-3.5 lg:flex">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">
            {hello}, {first}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {todo.length ? `You have ${todo.length} ${todo.length === 1 ? "thing" : "things"} waiting` : "Nothing is waiting on you"}
            {week.length ? ` and ${week.length} ${visitWord(week.length)} this week.` : "."}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={toggleShopOpen}>
            <SubmitButton pendingText="…" className="h-11 rounded-xl border border-[#D5DAE3] bg-white px-4 text-sm font-extrabold">
              {shop.isOpen ? "Close shop" : "Open shop"}
            </SubmitButton>
          </form>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Order from ${shop.name} on Vouchly: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center rounded-xl border border-[#D5DAE3] bg-white px-4 text-sm font-extrabold"
          >
            Share my page
          </a>
          <Link href="/shop/manage/products/new" className="flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
            {type === "service" ? "Add a service" : "Add a product"}
          </Link>
        </div>
      </header>

      <header className="flex items-center justify-between gap-3 px-4 pb-1.5 pt-[18px] lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-muted">
            {shop.name} · <span className={shop.isOpen ? "text-[#1D7A46]" : "text-muted"}>{shop.isOpen ? "Open" : "Closed"}</span>
          </p>
          <h1 className="mt-0.5 text-[26px] font-extrabold tracking-[-0.02em]">My shop</h1>
        </div>
        <Link href={`/s/${shop.slug}`} className="flex h-11 shrink-0 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold">
          View as buyer
        </Link>
      </header>

      <div className="flex flex-col gap-[22px] px-4 pt-3 lg:gap-[18px] lg:px-0 lg:pt-0">
        {saved === "product" && <Note tone="green">Saved.</Note>}
        {saved === "removed" && <Note tone="green">Removed.</Note>}

        <div className="hidden grid-cols-4 gap-3.5 lg:grid">
          {kpis.map((k) => (
            <div key={k.label} className={`${card} p-[18px]`}>
              <p className="text-[13px] font-bold text-muted">{k.label}</p>
              <p className="mb-0.5 mt-1.5 text-[26px] font-extrabold tracking-[-0.02em] tabular-nums">{k.value}</p>
              <p className={`text-xs font-bold ${k.tone}`}>{k.sub}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[22px] bg-ink p-[18px] text-white lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-[#AFC0F5]">Earned this week</p>
              <p className="mt-1 text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">{naira(earned)}</p>
              <p className="mt-0.5 text-[13px] text-[#C9D3EE]">
                After Vouchly&apos;s 5% · {weekPay.length} {weekPay.length === 1 ? "sale" : "sales"}
              </p>
            </div>
            <Link href="/shop/manage/sales" className="flex h-11 shrink-0 items-center rounded-full bg-white/[0.12] px-3.5 text-[13px] font-bold">
              Details
            </Link>
          </div>
          <div className="mt-4 flex h-16 items-end gap-2" role="img" aria-label={`Earned per day: ${days.map((k) => `${dayName(k)} ${naira(byDay[k])}`).join(", ")}`}>
            {days.map((k) => (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={`w-full rounded-md ${k === todayKey ? "bg-white" : "bg-[#3D5BD9]"}`} style={{ height: byDay[k] ? `${Math.max(6, Math.round((byDay[k] / top) * 44))}px` : "3px" }} />
                <span className={`text-[10px] font-bold ${k === todayKey ? "text-white" : "text-[#AFC0F5]"}`}>{dayLetter(k)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-[18px]">
          <section>
            <h2 className="mb-2.5 flex items-center gap-1.5 text-[17px] font-extrabold">
              Needs you now
              {todo.length > 0 && <span className="rounded-full bg-[#FDE2E1] px-2 py-0.5 text-xs font-extrabold text-[#B42318]">{todo.length}</span>}
            </h2>
            {todo.length === 0 ? (
              <p className={`${card} px-4 py-3.5 text-sm font-semibold text-muted`}>You&apos;re all caught up.</p>
            ) : (
              <div className={card}>
                {shown.map((o, i) => (
                  <div key={o.code} className={`flex items-center gap-3 px-4 py-3.5 ${i < shown.length - 1 ? "border-b border-line" : ""}`}>
                    <Link href={`/shop/manage/orders/${o.code}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{what(o)}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                        {o.buyer.split(" ")[0]}
                        {o.guest ? " (guest)" : ""} · {deliveryDayLabel(o.day).split(",")[0]}
                      </span>
                    </Link>
                    {o.next && !o.next.form ? (
                      <TodoButton code={o.code} to={o.next.to} label={short(o.next.label)} />
                    ) : (
                      <Link href={`/shop/manage/orders/${o.code}`} className="flex h-11 shrink-0 items-center rounded-xl bg-accent px-3.5 text-[13px] font-extrabold text-white">
                        {o.status === "requested" ? "Send price" : o.status === "disputed" ? "View" : o.next ? short(o.next.label) : "View"}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href="/shop/manage/orders" className="mt-2.5 block text-center text-sm font-bold text-accent">
              All orders{open.length ? ` (${open.length} open)` : ""}
            </Link>
          </section>

          <section className={`${card} hidden lg:block`}>
            <div className="flex items-baseline justify-between border-b border-line px-[18px] py-4">
              <h2 className="text-[17px] font-extrabold">This week</h2>
              <Link href="/shop/manage/orders" className="text-[13px] font-extrabold text-accent">
                All orders
              </Link>
            </div>
            {week.length === 0 ? (
              <p className="px-[18px] py-4 text-sm font-semibold text-muted">Nothing booked for the next 7 days. Share your page to get more.</p>
            ) : (
              week.map((o, i) => {
                const d = dayParts(o.day);
                return (
                  <Link key={o.code} href={`/shop/manage/orders/${o.code}`} className={`flex gap-3 px-[18px] py-3 hover:bg-bg ${i < week.length - 1 ? "border-b border-line" : ""}`}>
                    <span className="w-[46px] shrink-0 text-center">
                      <span className="block text-[11px] font-extrabold text-muted">{d.w}</span>
                      <span className="block text-xl font-extrabold">{d.n}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">
                        {o.buyer.split(" ")[0]}
                        {o.guest ? " (guest)" : ""}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">{[o.slot ? slotLabel(o.slot).split(" (")[0] : null, o.first ?? "Order"].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </section>
        </div>

        <section className={`${card} hidden overflow-x-auto lg:block`}>
          <div className="flex items-baseline justify-between px-[18px] py-4">
            <h2 className="text-[17px] font-extrabold">Latest payments</h2>
            <Link href="/shop/manage/sales" className="text-[13px] font-extrabold text-accent">
              All sales
            </Link>
          </div>
          {latestPay.length === 0 ? (
            <p className="border-t border-line px-[18px] py-4 text-sm font-semibold text-muted">No payments yet. Share your page to get your first sale.</p>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-[18px] py-2 font-extrabold">Date</th>
                  <th className="px-[18px] py-2 font-extrabold">{type === "service" ? "Client" : "Buyer"}</th>
                  <th className="px-[18px] py-2 font-extrabold">{type === "service" ? "Job" : "What"}</th>
                  <th className="px-[18px] py-2 text-right font-extrabold">Paid</th>
                  <th className="px-[18px] py-2 text-right font-extrabold">You get</th>
                </tr>
              </thead>
              <tbody>
                {latestPay.map((p) => (
                  <tr key={p.code + p.at.toISOString()} className="border-t border-line">
                    <td className="px-[18px] py-3 text-muted">{shortDate(p.at)}</td>
                    <td className="px-[18px] py-3 font-bold">
                      {p.buyer.split(" ")[0]}
                      {p.guest ? " (guest)" : ""}
                    </td>
                    <td className="px-[18px] py-3">
                      <Link href={`/shop/manage/orders/${p.code}`} className="hover:underline">
                        {p.first ?? p.code}
                      </Link>
                    </td>
                    <td className="px-[18px] py-3 text-right tabular-nums">{naira(p.paid)}</td>
                    <td className="px-[18px] py-3 text-right font-extrabold tabular-nums">{naira(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <nav aria-label="Shop tools" className="grid grid-cols-4 gap-2.5 lg:hidden">
          {[
            { href: "/shop/manage/products/new", label: "Add listing", icon: "M12 5v14M5 12h14" },
            { href: "/shop/manage/sales", label: "Sales", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
            { href: "/shop/manage/discounts", label: "Discounts", icon: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01" },
            { href: "/shop/manage/edit", label: "Edit shop", icon: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`${card} flex flex-col items-center gap-2 px-1 py-3.5 text-center text-xs font-bold leading-tight`}>
              <span className="grid size-10 place-items-center rounded-xl bg-soft text-deep">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={a.icon} />
                </svg>
              </span>
              {a.label}
            </Link>
          ))}
        </nav>

        <section className="rounded-[18px] bg-soft p-4 lg:hidden">
          <p className="text-[15px] font-extrabold">Share your shop</p>
          <p className="mb-3 mt-1 text-[13px] leading-snug text-[#1E2A4A]">Anyone can buy from this link, even without an account.</p>
          <div className="flex gap-2">
            <Link href={`/s/${shop.slug}`} className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-xl bg-white px-3 text-[13px] font-bold">
              <span className="truncate">{link.replace(/^https?:\/\//, "")}</span>
            </Link>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Order from ${shop.name} on Vouchly: ${link}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 shrink-0 items-center rounded-xl bg-[#1F7A46] px-3.5 text-[13px] font-extrabold text-white"
            >
              WhatsApp
            </a>
          </div>
          {ai && (
            <details className="mt-3 border-t border-[#c9d3f3] pt-3">
              <summary className="flex h-9 cursor-pointer list-none items-center justify-between text-sm font-bold text-accent">
                Make a post about my shop <span aria-hidden="true">›</span>
              </summary>
              <div className="pt-2">
                <PostMaker />
              </div>
            </details>
          )}
        </section>

        <section className={`${card} px-4 lg:hidden`}>
          <Link href="/shop/manage/payout" className="flex items-center justify-between gap-3 border-b border-line py-3.5">
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">Payout account</span>
              <span className={`block truncate text-[13px] ${shop.paystackSubaccount ? "text-muted" : "font-bold text-[#7a4d06]"}`}>
                {shop.paystackSubaccount
                  ? [shop.payoutBank, shop.payoutAccountLast4 && `···· ${shop.payoutAccountLast4}`].filter(Boolean).join(" · ") || "Set up"
                  : "Add your bank account so buyers can pay you"}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
          <Link href="/shop/manage/delivery" className="flex items-center justify-between gap-3 border-b border-line py-3.5">
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">Delivery</span>
              <span className="block truncate text-[13px] text-muted">
                {delivery ? `${ways || "No way to get it yet"} · ${dayList(delivery.deliveryDays)} · order by ${cutoffLabel(delivery.orderCutoff)}` : "Not set up yet"}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
          <div className="flex items-center justify-between gap-3 py-3.5">
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">{shop.isOpen ? "Shop is open" : "Shop is closed"}</span>
              <span className="block text-[13px] text-muted">{shop.isOpen ? "Buyers can order now." : "Buyers can look but can't order."}</span>
            </span>
            <form action={toggleShopOpen}>
              <SubmitButton pendingText="…" className="h-11 rounded-full border border-line px-4 text-[13px] font-bold">
                {shop.isOpen ? "Close shop" : "Open shop"}
              </SubmitButton>
            </form>
          </div>
        </section>

        <section id="listings" className="scroll-mt-6 lg:pt-2">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-extrabold">{type === "service" ? "My services" : "Your listings"}</h2>
            <Link href="/shop/manage/products/new" className="text-sm font-bold text-accent">
              + Add
            </Link>
          </div>
          {items.length === 0 ? (
            <Link href="/shop/manage/products/new" className="block rounded-[18px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center">
              <p className="text-[15px] font-bold">No listings yet</p>
              <p className="mt-1 text-[13px] text-muted">Add your first one. A photo, a name and a price is all it takes.</p>
            </Link>
          ) : (
            <div className="cards lg:!grid-cols-3">
              {items.map((p) => (
                <div key={p.id} className={`${card} overflow-hidden`}>
                  <Link href={`/shop/manage/products/${p.id}`} className="flex items-center gap-3 p-2.5">
                    <span className="shimmer relative size-[52px] shrink-0 overflow-hidden rounded-xl">
                      <TilePhoto src={p.photos[0]} name={p.name} sizes="52px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{p.name}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted">{p.isActive ? statusLine(p) : "Hidden from buyers"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums">
                      {priceText(p)
                        .replace(/ (a night|a session|per .*)$/, "")
                        .replace("Price after a chat", "Quote")}
                    </span>
                  </Link>
                  {ai && p.isActive && (
                    <Link href={`/shop/manage/products/${p.id}?post=1#post`} className="flex h-10 items-center border-t border-line px-3 text-[13px] font-bold text-accent">
                      Make a post
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <TabBar active="Me" />
    </main>
  );
}
