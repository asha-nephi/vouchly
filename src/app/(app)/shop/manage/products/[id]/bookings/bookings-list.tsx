import Link from "next/link";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, users } from "@/db/schema";
import { naira } from "@/lib/catalog";
import { dateToKey, nightsBetween, shortDay, todayKey } from "@/lib/dates";
import { SELLER_STATUS, statusLabel, TONE } from "@/lib/order-status";
import { DataTable, type Column } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { getDensity } from "@/components/data/density";
import { flat, hrefWith, tableState, type Params } from "@/components/data/params";
import { loadSellerOrder, OrderDetail } from "../../../orders/[code]/order-detail";

type Shop = Parameters<typeof loadSellerOrder>[0];
type Row = Awaited<ReturnType<typeof bookings>>[number];

const WHEN = [
  { value: "upcoming", label: "Coming up or staying now" },
  { value: "past", label: "Past" },
];
const STATE = [
  { value: "active", label: "Not cancelled" },
  { value: "cancelled", label: "Cancelled" },
];
const placed = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });

// Every booking for one stay, with what the host gets.
export async function bookings(productId: string) {
  const list = await db
    .select({ id: orders.id, code: orders.code, status: orders.status, method: orders.method, inAt: orders.deliveryDay, outAt: orders.checkOut, guests: orders.guests, total: orders.itemsKobo, at: orders.createdAt, buyer: users.name, guest: users.isGuest })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orderItems.productId, productId), eq(orders.method, "check_in"), ne(orders.status, "awaiting_payment")));
  const pays = list.length ? await db.select({ orderId: payments.orderId, get: payments.sellerKobo }).from(payments).where(and(inArray(payments.orderId, list.map((o) => o.id)), ne(payments.status, "pending"))) : [];
  return list.map((o) => {
    const inKey = dateToKey(o.inAt);
    const outKey = o.outAt ? dateToKey(o.outAt) : inKey;
    return { ...o, inKey, outKey, nights: Math.max(1, nightsBetween(inKey, outKey)), youGet: pays.find((p) => p.orderId === o.id)?.get ?? null };
  });
}

const COLUMNS: Column<Row>[] = [
  { id: "checkin", label: "Check-in", sortable: true, cell: (r) => <span className="font-semibold">{shortDay(r.inKey)}</span> },
  { id: "checkout", label: "Check-out", cell: (r) => shortDay(r.outKey) },
  { id: "nights", label: "Nights", align: "right", cell: (r) => <span className="tabular-nums">{r.nights}</span> },
  { id: "guests", label: "Guests", align: "right", cell: (r) => <span className="tabular-nums">{r.guests ?? "—"}</span> },
  {
    id: "client",
    label: "Client",
    sortable: true,
    cell: (r) => (
      <span className="inline-flex max-w-[160px] items-center gap-1.5 xl:max-w-[240px]">
        <span className="truncate font-semibold">{r.buyer}</span>
        {r.guest && <span className="rounded-full bg-chip px-1.5 text-[11px] font-bold text-muted">Guest</span>}
      </span>
    ),
  },
  { id: "code", label: "Order", cell: (r) => <span className="font-bold">{r.code}</span> },
  {
    id: "status",
    label: "Status",
    cell: (r) => <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-bold ${TONE[SELLER_STATUS[r.status]?.tone ?? "grey"]}`}>{statusLabel(r.status, r.method, true)}</span>,
  },
  { id: "paid", label: "Paid", money: true, cell: (r) => naira(r.total) },
  { id: "youget", label: "You get", money: true, cell: (r) => <span className={`font-bold ${r.status === "cancelled" ? "text-muted line-through" : ""}`}>{r.youGet === null ? "—" : naira(r.youGet)}</span> },
  { id: "placed", label: "Booked on", sortable: true, cell: (r) => <span className="text-muted">{placed.format(r.at)}</span> },
];

// The List tab: one row per booking, with the order in the side panel.
export async function BookingsList({ shop, productId, path, sp }: { shop: Shop; productId: string; path: string; sp: Params }) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["checkin", "client", "placed"], sort: "checkin" });
  const today = todayKey();
  const [density, all] = await Promise.all([getDensity("seller"), bookings(productId)]);
  let rows = all;
  if (f.when === "upcoming") rows = rows.filter((r) => r.outKey >= today);
  if (f.when === "past") rows = rows.filter((r) => r.outKey < today);
  if (f.state === "active") rows = rows.filter((r) => r.status !== "cancelled");
  if (f.state === "cancelled") rows = rows.filter((r) => r.status === "cancelled");
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter((r) => r.buyer.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }
  const key: Record<string, (r: Row) => string | number> = { checkin: (r) => r.inKey, client: (r) => r.buyer.toLowerCase(), placed: (r) => r.at.getTime() };
  const by = key[st.sort] ?? key.checkin;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    return x === y ? a.code.localeCompare(b.code) : (x < y ? -1 : 1) * (st.dir === "asc" ? 1 : -1);
  });
  const open = st.open && rows.concat(all).some((r) => r.code === st.open) ? await loadSellerOrder(shop, st.open) : null;
  const nightsAhead = all.filter((r) => r.status !== "cancelled" && r.outKey >= today).reduce((n, r) => n + r.nights, 0);

  return (
    <DataLayout
      panel={
        open && (
          <SidePanel
            title={`Order ${open.o.code}`}
            sub={
              <Link href={`/shop/manage/orders/${open.o.code}`} className="font-bold text-accent">
                Open full page
              </Link>
            }
            closeHref={hrefWith(path, sp, { open: null })}
          >
            <div className="-mx-5 -my-4 flex min-h-full flex-col gap-4 bg-bg px-4 py-4">
              <OrderDetail data={open} />
            </div>
          </SidePanel>
        )
      }
    >
      <p className="mb-3 text-sm text-muted">
        <span className="font-semibold text-ink">{all.length}</span> {all.length === 1 ? "booking" : "bookings"} in all · <span className="font-semibold text-ink">{nightsAhead}</span>{" "}
        {nightsAhead === 1 ? "night" : "nights"} booked from today
      </p>
      <FilterBar
        path={path}
        sp={sp}
        page="/shop/manage/products/calendar"
        search="Search client or order code"
        filters={[
          { id: "when", label: "When", options: WHEN },
          { id: "state", label: "Status", options: STATE },
        ]}
        presets={[
          { name: "Coming up", query: "when=upcoming&state=active" },
          { name: "Past", query: "when=past" },
          { name: "Cancelled", query: "state=cancelled" },
        ]}
      />
      <DataTable
        label="Bookings"
        path={path}
        sp={sp}
        state={st}
        columns={COLUMNS}
        rows={rows.slice(st.offset, st.offset + st.per)}
        rowId={(r) => r.code}
        rowLabel={(r) => `booking ${r.code}`}
        total={rows.length}
        density={density}
        empty={Object.keys(f).some((k) => ["when", "state", "q"].includes(k)) ? "No bookings match these filters." : "No bookings yet. Share your listing link to get guests."}
      />
    </DataLayout>
  );
}
