import { naira } from "@/lib/catalog";
import { nairaCsv } from "@/components/data/csv";
import { Pill, type Column } from "@/components/data/data-table";
import type { DiscountRow } from "./discounts-query";

export const DISCOUNTS_PAGE = "/shop/manage/discounts";

const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });
export const offText = (r: DiscountRow) => (r.c.percentOff !== null ? `${r.c.percentOff}% off` : `${naira(r.c.amountOffKobo ?? 0)} off`);
export const usedText = (r: DiscountRow) => (r.c.maxUses !== null ? `${r.c.used} of ${r.c.maxUses}` : String(r.c.used));
export const STATUS = { on: { label: "On", tone: "green" }, off: { label: "Off", tone: "grey" }, finished: { label: "Finished", tone: "amber" } } as const;

export const DISCOUNT_COLUMNS: (Column<DiscountRow> & { csv: (r: DiscountRow) => string | number })[] = [
  { id: "code", label: "Code", sortable: true, cell: (r) => <span className="font-bold tracking-wide">{r.c.code}</span>, csv: (r) => r.c.code },
  { id: "type", label: "Type", cell: (r) => (r.c.percentOff !== null ? "% off" : "₦ off"), csv: (r) => (r.c.percentOff !== null ? "Percent" : "Amount") },
  {
    id: "off",
    label: "Off",
    align: "right",
    cell: (r) => <span className="tabular-nums">{offText(r)}</span>,
    csv: (r) => (r.c.percentOff !== null ? `${r.c.percentOff}%` : nairaCsv(r.c.amountOffKobo)),
  },
  { id: "used", label: "Used", sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{usedText(r)}</span>, csv: (r) => usedText(r) },
  { id: "ends", label: "Ends", sortable: true, cell: (r) => (r.c.endsAt ? lagos.format(r.c.endsAt) : <span className="text-muted">No end</span>), csv: (r) => r.c.endsAt?.toISOString() ?? "" },
  { id: "status", label: "Status", cell: (r) => <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>, csv: (r) => STATUS[r.status].label },
  { id: "given", label: "Discount given", money: true, cell: (r) => (r.given ? naira(r.given) : <span className="text-[#b4bccb]">—</span>), csv: (r) => nairaCsv(r.given) },
  { id: "sales", label: "Sales with code", money: true, cell: (r) => (r.sales ? naira(r.sales) : <span className="text-[#b4bccb]">—</span>), csv: (r) => nairaCsv(r.sales) },
  { id: "created", label: "Created", sortable: true, cell: (r) => <span className="text-muted">{lagos.format(r.c.createdAt)}</span>, csv: (r) => r.c.createdAt.toISOString() },
];
export const DISCOUNT_COLUMN_IDS = DISCOUNT_COLUMNS.map((c) => c.id);
export const DISCOUNT_DEFAULT = ["code", "type", "off", "used", "ends", "status", "created"];
