import { naira } from "@/lib/catalog";
import { nairaCsv } from "@/components/data/csv";
import { Pill, type Column } from "@/components/data/data-table";
import type { PayRow } from "./payments-query";

export const PAYMENTS_PAGE = "/admin/payments";
const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const fmt = (d: Date | null) => (d ? time.format(d).replace(",", "") : "");
const STATUS = {
  pending: { label: "Not finished", tone: "grey" },
  held: { label: "Held", tone: "amber" },
  released: { label: "Released", tone: "green" },
  refunded: { label: "Refunded", tone: "red" },
  part_refunded: { label: "Part refunded", tone: "red" },
} as const;

export const PAYMENT_COLUMNS: (Column<PayRow> & { csv: (r: PayRow) => string | number })[] = [
  { id: "date", label: "Date", sortable: true, cell: (r) => <span className="text-muted">{fmt(r.p.createdAt)}</span>, csv: (r) => r.p.createdAt.toISOString() },
  { id: "ref", label: "Reference", cell: (r) => <span className="font-mono text-xs">{r.p.paystackReference}</span>, csv: (r) => r.p.paystackReference },
  { id: "code", label: "Order", cell: (r) => <span className="font-bold">{r.code}</span>, csv: (r) => r.code },
  { id: "shop", label: "Shop", cell: (r) => <span className="block max-w-[180px] truncate">{r.shop}</span>, csv: (r) => r.shop },
  { id: "amount", label: "Amount", sortable: true, money: true, cell: (r) => naira(r.p.amountKobo), csv: (r) => nairaCsv(r.p.amountKobo) },
  { id: "fee", label: "Vouchly fee", sortable: true, money: true, cell: (r) => naira(r.p.feeKobo), csv: (r) => nairaCsv(r.p.feeKobo) },
  { id: "seller", label: "Seller share", money: true, cell: (r) => naira(r.p.sellerKobo), csv: (r) => nairaCsv(r.p.sellerKobo) },
  { id: "status", label: "Status", cell: (r) => <Pill tone={STATUS[r.p.status].tone}>{STATUS[r.p.status].label}</Pill>, csv: (r) => STATUS[r.p.status].label },
  { id: "released", label: "Released at", cell: (r) => <span className="text-muted">{fmt(r.p.releasedAt) || "—"}</span>, csv: (r) => r.p.releasedAt?.toISOString() ?? "" },
  { id: "refunded", label: "Refunded", money: true, cell: (r) => (r.p.refundedKobo ? naira(r.p.refundedKobo) : <span className="text-[#b4bccb]">—</span>), csv: (r) => nairaCsv(r.p.refundedKobo) },
  { id: "due", label: "Release due", cell: (r) => <span className="text-muted">{fmt(r.p.releaseAt) || "—"}</span>, csv: (r) => r.p.releaseAt?.toISOString() ?? "" },
  { id: "paidout", label: "Paid out at", cell: (r) => <span className="text-muted">{fmt(r.p.paidOutAt) || "—"}</span>, csv: (r) => r.p.paidOutAt?.toISOString() ?? "" },
];
export const PAYMENT_COLUMN_IDS = PAYMENT_COLUMNS.map((c) => c.id);
export const PAYMENT_DEFAULT = ["date", "ref", "code", "shop", "amount", "fee", "seller", "status", "released", "refunded"];
