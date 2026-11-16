import { naira } from "@/lib/catalog";
import { dateToKey, shortDay } from "@/lib/dates";
import { SELLER_STATUS, statusLabel, TONE } from "@/lib/order-status";
import { nairaCsv } from "@/components/data/csv";
import type { Column } from "@/components/data/data-table";
import { HOW, type OrderRow } from "./orders-query";

export const ORDERS_PAGE = "/shop/manage/orders";

const howLabel = (m: string) => HOW.find((h) => h.value === m)?.label ?? m;
const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const lagosTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false });
const placed = (d: Date) => lagos.format(d).replace(",", "");
// Delivery or booking day; stays show the range, sessions and events show the time.
function dayText(r: OrderRow) {
  const o = r.order;
  const d = shortDay(dateToKey(o.deliveryDay));
  if (o.method === "check_in" && o.checkOut) return `${d} → ${shortDay(dateToKey(o.checkOut))}`;
  if (o.method === "session" || o.method === "event") return `${d}, ${lagosTime.format(o.deliveryDay)}`;
  if (o.method === "download") return "—";
  return d;
}
function itemsText(r: OrderRow) {
  if (!r.items.length) return "";
  const first = r.items[0];
  const name = `${r.order.method === "visit" || r.order.method === "check_in" ? "" : `${first.quantity} × `}${[first.name, first.size].filter(Boolean).join(", ")}`;
  return r.items.length > 1 ? `${name} +${r.items.length - 1} more` : name;
}
const statusOf = (r: OrderRow) => statusLabel(r.order.status, r.order.method, true);

export const ORDER_COLUMNS: (Column<OrderRow> & { csv: (r: OrderRow) => string | number })[] = [
  { id: "code", label: "Order", cell: (r) => <span className="font-bold">{r.order.code}</span>, csv: (r) => r.order.code },
  { id: "placed", label: "Placed", sortable: true, cell: (r) => <span className="text-muted">{placed(r.order.createdAt)}</span>, csv: (r) => r.order.createdAt.toISOString() },
  {
    id: "buyer",
    label: "Buyer",
    sortable: true,
    cell: (r) => (
      <span className="inline-flex max-w-[130px] items-center gap-1.5 xl:max-w-[200px]">
        <span className="truncate font-semibold">{r.buyer}</span>
        {r.guest && <span className="rounded-full bg-chip px-1.5 text-[11px] font-bold text-muted">Guest</span>}
      </span>
    ),
    csv: (r) => `${r.buyer}${r.guest ? " (guest)" : ""}`,
  },
  { id: "phone", label: "Phone", cell: (r) => `0${r.phone.slice(3)}`, csv: (r) => `0${r.phone.slice(3)}` },
  { id: "items", label: "Items", cell: (r) => <span className="block max-w-[150px] truncate xl:max-w-[260px]">{itemsText(r)}</span>, csv: (r) => r.items.map((i) => `${i.quantity} x ${[i.name, i.size].filter(Boolean).join(", ")}`).join("; ") },
  { id: "how", label: "How", cell: (r) => howLabel(r.order.method), csv: (r) => howLabel(r.order.method) },
  { id: "day", label: "Day", sortable: true, cell: (r) => dayText(r), csv: (r) => dayText(r) },
  {
    id: "status",
    label: "Status",
    cell: (r) => <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-bold ${TONE[SELLER_STATUS[r.order.status]?.tone ?? "grey"]}`}>{statusOf(r)}</span>,
    csv: (r) => statusOf(r),
  },
  { id: "total", label: "Total", sortable: true, money: true, cell: (r) => naira(r.total), csv: (r) => nairaCsv(r.total) },
  { id: "youget", label: "You get", money: true, cell: (r) => <span className="font-bold">{naira(r.youGet)}</span>, csv: (r) => nairaCsv(r.youGet) },
];
export const ORDER_COLUMN_IDS = ORDER_COLUMNS.map((c) => c.id);
export const ORDER_DEFAULT = ["code", "placed", "buyer", "items", "how", "day", "status", "total", "youget"];
