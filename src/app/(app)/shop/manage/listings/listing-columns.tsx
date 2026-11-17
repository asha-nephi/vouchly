import { naira } from "@/lib/catalog";
import { KIND_LABEL } from "@/lib/listings";
import TilePhoto from "@/components/tile-photo";
import { nairaCsv } from "@/components/data/csv";
import type { Column } from "@/components/data/data-table";
import type { ListingRow } from "./listings-query";
import { ActiveSwitch, InlineEdit } from "./inline-edit";

export const LISTINGS_PAGE = "/shop/manage/listings";

const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });
const quote = (r: ListingRow) => r.p.kind === "service" && r.p.priceType === "quote";
const priceShown = (r: ListingRow) => (quote(r) ? "Quote" : r.p.priceKobo === 0 ? "Free" : naira(r.p.priceKobo));
// Products: how many left. Events: seats left. Others have no stock.
function stockText(r: ListingRow) {
  if (r.p.kind === "item") return r.p.stock === null ? "No limit" : String(r.p.stock);
  if (r.p.kind === "event" && r.p.seats) return `${r.seatsLeft} of ${r.p.seats} seats`;
  return "";
}

export const LISTING_COLUMNS: (Column<ListingRow> & { csv: (r: ListingRow) => string | number })[] = [
  {
    id: "photo",
    label: "Photo",
    width: "w-14",
    cell: (r) => (
      <span className="shimmer relative block size-8 overflow-hidden rounded-lg [&>span]:text-[11px]">
        <TilePhoto src={r.p.photos[0]} name={r.p.name} sizes="32px" />
      </span>
    ),
    csv: (r) => r.p.photos[0] ?? "",
  },
  {
    id: "name",
    label: "Name",
    sortable: true,
    cell: (r) => (
      <span className="inline-flex max-w-[180px] items-center gap-1.5 xl:max-w-[240px]">
        <span className="truncate font-semibold">{r.p.name}</span>
        {r.soldOut && <span className="shrink-0 rounded-full bg-[#FDE2E1] px-1.5 text-[11px] font-bold text-[#B42318]">{r.p.kind === "event" ? "Full" : "Sold out"}</span>}
      </span>
    ),
    csv: (r) => r.p.name,
  },
  { id: "kind", label: "Kind", cell: (r) => KIND_LABEL[r.p.kind], csv: (r) => KIND_LABEL[r.p.kind] },
  {
    id: "collection",
    label: "Collection",
    cell: (r) => <span className="block max-w-[140px] truncate text-muted xl:max-w-[200px]">{r.collections.map((c) => c.name).join(", ") || "—"}</span>,
    csv: (r) => r.collections.map((c) => c.name).join("; "),
  },
  {
    id: "price",
    label: "Price",
    sortable: true,
    money: true,
    cell: (r) =>
      quote(r) ? (
        <span className="text-muted">Quote</span>
      ) : (
        <InlineEdit id={r.p.id} field="price" name={r.p.name} shown={priceShown(r)} start={String(r.p.priceKobo / 100)} />
      ),
    csv: (r) => (quote(r) ? "Quote" : nairaCsv(r.p.priceKobo)),
  },
  {
    id: "stock",
    label: "Stock",
    sortable: true,
    align: "right",
    cell: (r) =>
      r.p.kind === "item" ? (
        <InlineEdit
          id={r.p.id}
          field="stock"
          name={r.p.name}
          shown={r.p.stock === null ? <span className="text-muted">No limit</span> : r.p.stock === 0 ? <span className="font-bold text-[#B42318]">0</span> : r.p.stock}
          start={r.p.stock === null ? "" : String(r.p.stock)}
          hint="How many you have. Leave empty for no limit."
        />
      ) : (
        <span className="text-muted">{stockText(r) || "—"}</span>
      ),
    csv: (r) => stockText(r),
  },
  { id: "week", label: "Sold this week", sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.week || <span className="text-[#b4bccb]">0</span>}</span>, csv: (r) => r.week },
  { id: "all", label: "Sold in all", align: "right", cell: (r) => <span className="tabular-nums">{r.all}</span>, csv: (r) => r.all },
  { id: "waiting", label: "Waiting", align: "right", cell: (r) => <span className="tabular-nums">{r.waiting || "—"}</span>, csv: (r) => r.waiting },
  { id: "status", label: "Status", cell: (r) => <ActiveSwitch id={r.p.id} on={r.p.isActive} name={r.p.name} />, csv: (r) => (r.p.isActive ? "On" : "Off") },
  { id: "updated", label: "Updated", sortable: true, cell: (r) => <span className="text-muted">{lagos.format(r.p.updatedAt)}</span>, csv: (r) => r.p.updatedAt.toISOString() },
];
export const LISTING_COLUMN_IDS = LISTING_COLUMNS.map((c) => c.id);
export const LISTING_DEFAULT = ["photo", "name", "kind", "collection", "price", "stock", "week", "status", "updated"];
