import { naira } from "@/lib/catalog";
import { nairaCsv } from "@/components/data/csv";
import { Pill, type Column } from "@/components/data/data-table";
import type { AttendeeRow } from "./attendees-query";
import CheckInBox from "./check-in-box";

// One key for every event's column choices and saved views.
export const ATTENDEES_PAGE = "/shop/manage/products/attendees";

const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const phone = (p: string) => `0${p.slice(3)}`;
const lagosTime = (d: Date) => lagos.format(d).replace(",", "");

export const ATTENDEE_COLUMNS: (Column<AttendeeRow> & { csv: (r: AttendeeRow) => string | number })[] = [
  {
    id: "name",
    label: "Name",
    sortable: true,
    cell: (r) => (
      <span className="inline-flex max-w-[180px] items-center gap-1.5 xl:max-w-[260px]">
        <span className="truncate font-semibold">{r.name}</span>
        {r.guest && <span className="rounded-full bg-chip px-1.5 text-[11px] font-bold text-muted">Guest</span>}
      </span>
    ),
    csv: (r) => r.name,
  },
  { id: "phone", label: "Phone", cell: (r) => <span className="tabular-nums">{phone(r.phone)}</span>, csv: (r) => phone(r.phone) },
  { id: "tickets", label: "Tickets", sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-bold">{r.qty}</span>, csv: (r) => r.qty },
  { id: "code", label: "Ticket code", cell: (r) => <span className="font-mono text-[13px] font-bold">{r.code}</span>, csv: (r) => r.code },
  {
    id: "paid",
    label: "Paid",
    cell: (r) => (r.paid ? <Pill tone="green">Paid {r.amount ? naira(r.amount) : "(free)"}</Pill> : <Pill tone="amber">Not paid yet</Pill>),
    csv: (r) => (r.paid ? nairaCsv(r.amount) : "Not paid"),
  },
  {
    id: "in",
    label: "Checked in",
    cell: (r) => (r.paid ? <CheckInBox pid={r.pid} code={r.code} name={r.name} on={!!r.checkedInAt} /> : <span className="text-[#b4bccb]">—</span>),
    csv: (r) => (r.checkedInAt ? lagosTime(r.checkedInAt) : ""),
  },
  { id: "ward", label: "Ward", cell: (r) => <span className="text-muted">{r.ward === "Guest" ? "—" : r.ward}</span>, csv: (r) => (r.ward === "Guest" ? "" : r.ward) },
  { id: "ordered", label: "Ordered", sortable: true, cell: (r) => <span className="text-muted">{lagosTime(r.at)}</span>, csv: (r) => r.at.toISOString() },
];
export const ATTENDEE_COLUMN_IDS = ATTENDEE_COLUMNS.map((c) => c.id);
export const ATTENDEE_DEFAULT = ["name", "phone", "tickets", "code", "paid", "in"];
