import Link from "next/link";
import { naira } from "@/lib/catalog";
import { nairaCsv } from "@/components/data/csv";
import { Pill, type Column } from "@/components/data/data-table";
import { SELLER_LABEL, STATUS_LABEL, type ShopRow } from "./shops-query";

export const SHOPS_PAGE = "/admin/shops";
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });
const TONE = { open: "green", waiting: "amber", closed: "grey" } as const;

export const SHOP_COLUMNS: (Column<ShopRow> & { csv: (r: ShopRow) => string | number })[] = [
  {
    id: "name",
    label: "Shop",
    sortable: true,
    cell: (r) => (
      <Link href={`/s/${r.s.slug}`} className="block max-w-[200px] truncate font-semibold hover:text-accent hover:underline xl:max-w-[260px]">
        {r.s.name}
      </Link>
    ),
    csv: (r) => r.s.name,
  },
  {
    id: "owner",
    label: "Owner",
    cell: (r) => (
      <Link href={`/admin/members?open=${r.ownerId}`} className="block max-w-[160px] truncate hover:text-accent hover:underline">
        {r.owner}
      </Link>
    ),
    csv: (r) => r.owner,
  },
  { id: "type", label: "Seller type", cell: (r) => SELLER_LABEL[r.s.sellerType], csv: (r) => SELLER_LABEL[r.s.sellerType] },
  { id: "ward", label: "Ward", cell: (r) => <span className="block max-w-[140px] truncate">{r.ward}</span>, csv: (r) => r.ward },
  { id: "listings", label: "Listings", sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.live === r.listings ? r.listings : `${r.live} of ${r.listings}`}</span>, csv: (r) => r.listings },
  { id: "orders", label: "Orders this month", sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.orders || <span className="text-[#b4bccb]">0</span>}</span>, csv: (r) => r.orders },
  { id: "sales", label: "Sales this month", sortable: true, money: true, cell: (r) => (r.sales ? naira(r.sales) : <span className="text-[#b4bccb]">—</span>), csv: (r) => nairaCsv(r.sales) },
  { id: "payout", label: "Payout account", cell: (r) => (r.payout ? <Pill tone="green">Set</Pill> : <Pill tone="amber">Not set</Pill>), csv: (r) => (r.payout ? "Set" : "Not set") },
  { id: "status", label: "Status", cell: (r) => <Pill tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>, csv: (r) => STATUS_LABEL[r.status] },
  { id: "created", label: "Created", sortable: true, cell: (r) => <span className="text-muted">{day.format(r.s.createdAt)}</span>, csv: (r) => r.s.createdAt.toISOString() },
  { id: "area", label: "Area", cell: (r) => r.s.area, csv: (r) => r.s.area },
];
export const SHOP_COLUMN_IDS = SHOP_COLUMNS.map((c) => c.id);
export const SHOP_DEFAULT = ["name", "owner", "type", "ward", "listings", "orders", "sales", "payout", "status", "created"];
