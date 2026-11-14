import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
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
  const weekAgo = new Date(Date.now() - 7 * DAY);

  const [items, [delivery], weekPay, open, perProduct] = await Promise.all([
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
  const todo = open
    .map((o) => ({ ...o, next: sellerNext(o.status, o.method) }))
    .filter((o) => o.next || o.status === "requested" || o.status === "disputed");
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

  const link = `${process.env.SITE_URL ?? "https://vouchly-af24.onrender.com"}/s/${shop.slug}`;
  const ways = delivery ? [delivery.pickupOn && "Pickup", delivery.dropOffOn && "Drop-off", delivery.riderOn && "Rider"].filter(Boolean).join(" · ") : "";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="flex items-center justify-between gap-3 px-4 pb-1.5 pt-[18px]">
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

      <div className="flex flex-col gap-[22px] px-4 pt-3">
        {saved === "product" && <Note tone="green">Saved.</Note>}
        {saved === "removed" && <Note tone="green">Removed.</Note>}

        <section className="rounded-[22px] bg-ink p-[18px] text-white">
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
                <span
                  className={`w-full rounded-md ${k === todayKey ? "bg-white" : "bg-[#3D5BD9]"}`}
                  style={{ height: byDay[k] ? `${Math.max(6, Math.round((byDay[k] / top) * 44))}px` : "3px" }}
                />
                <span className={`text-[10px] font-bold ${k === todayKey ? "text-white" : "text-[#AFC0F5]"}`}>{dayLetter(k)}</span>
              </div>
            ))}
          </div>
        </section>

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
                      {o.status === "requested" ? "Send price" : o.status === "disputed" ? "View" : (o.next ? short(o.next.label) : "View")}
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

        <nav aria-label="Shop tools" className="grid grid-cols-4 gap-2.5">
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

        <section className="rounded-[18px] bg-soft p-4">
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
        </section>

        <section className={`${card} px-4`}>
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

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-extrabold">Your listings</h2>
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
            <div className="cards">
              {items.map((p) => (
                <Link key={p.id} href={`/shop/manage/products/${p.id}`} className={`${card} flex items-center gap-3 p-2.5`}>
                  <span className="shimmer relative size-[52px] shrink-0 overflow-hidden rounded-xl">
                    <TilePhoto src={p.photos[0]} name={p.name} sizes="52px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{p.name}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-muted">{p.isActive ? statusLine(p) : "Hidden from buyers"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums">{priceText(p).replace(/ (a night|a session|per .*)$/, "").replace("Price after a chat", "Quote")}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <TabBar active="Me" />
    </main>
  );
}
