import { naira } from "@/lib/catalog";
import { nairaCsv } from "@/components/data/csv";
import { Pill, type Column } from "@/components/data/data-table";
import type { SaleRow } from "./sales-query";

export const SALES_PAGE = "/shop/manage/sales";

const lagos = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "2-digit",
});
const lagosTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const PAYOUT = {
  held: { label: "Held", tone: "amber" },
  released: { label: "Released", tone: "green" },
  refunded: { label: "Refunded", tone: "red" },
  part_refunded: { label: "Part refunded", tone: "red" },
  pending: { label: "Not paid", tone: "grey" },
} as const;
const refunded = (r: SaleRow) => r.pay.status === "refunded";
// When the money left: hold mode sets paidOutAt; the split sends it on release.
const paidOut = (r: SaleRow) => r.pay.paidOutAt ?? (r.pay.status === "released" ? r.pay.releasedAt : null);
function itemsText(r: SaleRow) {
  if (!r.items.length) return "";
  const first = r.items[0];
  const name = `${first.quantity} × ${[first.name, first.size].filter(Boolean).join(", ")}`;
  return r.items.length > 1 ? `${name} +${r.items.length - 1} more` : name;
}

export const SALE_COLUMNS: (Column<SaleRow> & {
  csv: (r: SaleRow) => string | number;
})[] = [
  {
    id: "date",
    label: "Date",
    sortable: true,
    cell: (r) => <span className="text-muted">{lagosTime.format(r.pay.createdAt).replace(",", "")}</span>,
    csv: (r) => r.pay.createdAt.toISOString(),
  },
  {
    id: "code",
    label: "Order",
    cell: (r) => <span className="font-bold">{r.code}</span>,
    csv: (r) => r.code,
  },
  {
    id: "buyer",
    label: "Buyer",
    cell: (r) => (
      <span className="inline-flex max-w-[130px] items-center gap-1.5 xl:max-w-[200px]">
        <span className="truncate font-semibold">{r.buyer}</span>
        {r.guest && <span className="rounded-full bg-chip px-1.5 text-[11px] font-bold text-muted">Guest</span>}
      </span>
    ),
    csv: (r) => `${r.buyer}${r.guest ? " (guest)" : ""}`,
  },
  {
    id: "items",
    label: "Items",
    cell: (r) => <span className="block max-w-[150px] truncate xl:max-w-[260px]">{itemsText(r)}</span>,
    csv: (r) => r.items.map((i) => `${i.quantity} x ${[i.name, i.size].filter(Boolean).join(", ")}`).join("; "),
  },
  {
    id: "paid",
    label: "Buyer paid",
    sortable: true,
    money: true,
    cell: (r) => naira(r.pay.amountKobo),
    csv: (r) => nairaCsv(r.pay.amountKobo),
  },
  {
    id: "fee",
    label: "Vouchly fee",
    money: true,
    cell: (r) => <span className="text-muted">{naira(r.pay.feeKobo)}</span>,
    csv: (r) => nairaCsv(r.pay.feeKobo),
  },
  {
    id: "get",
    label: "You get",
    sortable: true,
    money: true,
    cell: (r) => <span className={`font-bold ${refunded(r) ? "text-muted line-through" : ""}`}>{naira(r.pay.sellerKobo)}</span>,
    csv: (r) => nairaCsv(refunded(r) ? 0 : r.pay.sellerKobo),
  },
  {
    id: "refund",
    label: "Refunded",
    money: true,
    cell: (r) => (r.pay.refundedKobo ? naira(r.pay.refundedKobo) : <span className="text-[#b4bccb]">—</span>),
    csv: (r) => nairaCsv(r.pay.refundedKobo),
  },
  {
    id: "payout",
    label: "Payout",
    cell: (r) => {
      const p = PAYOUT[r.pay.status];
      return <Pill tone={p.tone}>{p.label}</Pill>;
    },
    csv: (r) => PAYOUT[r.pay.status].label,
  },
  {
    id: "out",
    label: "Paid out on",
    cell: (r) => {
      const d = paidOut(r);
      if (d) return lagos.format(d);
      if (r.pay.status === "held" && r.pay.releaseAt) return <span className="text-muted">Due {lagos.format(r.pay.releaseAt)}</span>;
      return <span className="text-[#b4bccb]">—</span>;
    },
    csv: (r) => paidOut(r)?.toISOString() ?? "",
  },
  {
    id: "ref",
    label: "Paystack ref",
    cell: (r) => <span className="font-mono text-xs text-muted">{r.pay.paystackReference}</span>,
    csv: (r) => r.pay.paystackReference,
  },
];
export const SALE_COLUMN_IDS = SALE_COLUMNS.map((c) => c.id);
export const SALE_DEFAULT = ["date", "code", "buyer", "items", "paid", "fee", "get", "payout", "out"];
