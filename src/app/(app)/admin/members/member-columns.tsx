import { maskPhone } from "@/lib/phone";
import { Pill, type Column } from "@/components/data/data-table";
import { ROLE_LABEL, type MemberRow } from "./members-query";

export const MEMBERS_PAGE = "/admin/members";
const SELLER = { products: "Products", service: "Services", online: "Online" } as const;

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });
export const waiting = (r: MemberRow) => r.u.role === "member" && !r.u.confirmed;
const phoneText = (r: MemberRow, full: boolean) => (full ? `0${r.u.phone.slice(3)}` : maskPhone(r.u.phone));

// Admins see full phone numbers. Ward contacts see them masked, like before.
export function memberColumns(full: boolean): (Column<MemberRow> & { csv: (r: MemberRow) => string | number })[] {
  return [
    { id: "name", label: "Name", sortable: true, cell: (r) => <span className="block max-w-[180px] truncate font-semibold xl:max-w-[240px]">{r.u.name}</span>, csv: (r) => r.u.name },
    {
      id: "email",
      label: "Email",
      cell: (r) =>
        r.u.email ? (
          <span className="inline-flex max-w-[200px] items-center gap-1.5 xl:max-w-[260px]">
            <span className="truncate">{r.u.email}</span>
            {r.u.emailVerifiedAt && <span className="text-xs font-bold text-[#1b6b3a]" title="Email checked">✓</span>}
          </span>
        ) : (
          <span className="text-[#b4bccb]">—</span>
        ),
      csv: (r) => r.u.email ?? "",
    },
    {
      id: "phone",
      label: "Phone",
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          {phoneText(r, full)}
          {r.u.phoneVerifiedAt ? <span className="text-xs font-bold text-[#1b6b3a]" title="Phone checked by SMS">✓</span> : null}
        </span>
      ),
      csv: (r) => phoneText(r, full),
    },
    { id: "ward", label: "Ward", sortable: true, cell: (r) => r.u.ward, csv: (r) => r.u.ward },
    { id: "role", label: "Role", cell: (r) => ROLE_LABEL[r.u.role], csv: (r) => ROLE_LABEL[r.u.role] },
    { id: "seller", label: "Seller type", cell: (r) => (r.shop?.sellerType ? SELLER[r.shop.sellerType] : <span className="text-[#b4bccb]">—</span>), csv: (r) => (r.shop?.sellerType ? SELLER[r.shop.sellerType] : "") },
    {
      id: "shop",
      label: "Shop",
      cell: (r) => (r.shop?.name ? <span className="block max-w-[160px] truncate xl:max-w-[220px]">{r.shop.name}</span> : <span className="text-[#b4bccb]">—</span>),
      csv: (r) => r.shop?.name ?? "",
    },
    { id: "joined", label: "Joined", sortable: true, cell: (r) => <span className="text-muted">{day.format(r.u.createdAt)}</span>, csv: (r) => r.u.createdAt.toISOString() },
    { id: "active", label: "Last sign-in", sortable: true, cell: (r) => <span className="text-muted">{r.lastActive ? day.format(r.lastActive) : "—"}</span>, csv: (r) => r.lastActive?.toISOString() ?? "" },
    { id: "status", label: "Status", cell: (r) => (waiting(r) ? <Pill tone="amber">Waiting</Pill> : <Pill tone="green">Confirmed</Pill>), csv: (r) => (waiting(r) ? "Waiting" : "Confirmed") },
    { id: "invited", label: "Invited by", cell: (r) => <span className="text-muted">{r.invitedBy ?? "Founder"}</span>, csv: (r) => r.invitedBy ?? "Founder" },
  ];
}
export const MEMBER_COLUMN_IDS = memberColumns(false).map((c) => c.id);
export const MEMBER_DEFAULT = ["name", "email", "phone", "ward", "role", "shop", "joined", "active", "status"];
