import Link from "next/link";
import { confirmMember } from "@/app/actions";
import SubmitButton from "@/components/submit-button";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { hrefWith, viewQuery, type Params } from "@/components/data/params";
import { JOINED_FILTER, loadMembers, memberDetail, ROLE_FILTER, ROLE_LABEL, SHOP_FILTER, STATUS_FILTER, wardList } from "./members-query";
import { MEMBER_COLUMN_IDS, MEMBER_DEFAULT, MEMBERS_PAGE, memberColumns, waiting } from "./member-columns";
import { bulkConfirm, exportMembers } from "./table-actions";
import { LiftForm, RoleForm, SuspendForm } from "./admin-forms";
import { memberHistory } from "@/lib/members";

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// One member in the side panel: profile, who invited and confirmed them, shop, orders, Confirm.
async function MemberView({ id, full, back, meId }: { id: string; full: boolean; back: string; meId: string }) {
  const [m, history] = await Promise.all([memberDetail(id), full ? memberHistory(id) : Promise.resolve([])]);
  if (!m) return <p className="text-sm text-muted">We couldn&apos;t find this member.</p>;
  // Admin tools: not on yourself, not on other admins.
  const canManage = full && m.u.id !== meId && m.u.role !== "admin";
  const suspendedBy = m.u.suspendedById ? history.find((h) => h.action === "suspended")?.by : null;
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-semibold break-words">{value}</dd>
    </div>
  );
  const phone = full ? `0${m.u.phone.slice(3)}` : null;
  return (
    <div className="flex flex-col gap-4">
      {m.u.suspendedAt ? (
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-[#fbebeb] px-3.5 py-3 text-sm text-[#5c1a12]">
          <p className="font-bold text-[#b42318]">
            Suspended on {day.format(m.u.suspendedAt)}
            {suspendedBy ? ` by ${suspendedBy}` : ""}
          </p>
          <p>They can&apos;t sign in, their shop is closed and their invite code doesn&apos;t work.</p>
          {full && m.u.suspendedReason && <p>Why: {m.u.suspendedReason}</p>}
          {m.openOrders > 0 && (
            <p className="font-bold">
              Their shop still has {m.openOrders} open {m.openOrders === 1 ? "order" : "orders"}. Check them with the buyers, or in Problems.
            </p>
          )}
          {canManage && <LiftForm id={m.u.id} />}
        </div>
      ) : waiting(m) ? (
        <form action={confirmMember} className="flex items-center justify-between gap-3 rounded-[14px] bg-[#fdf0d5] px-3.5 py-3">
          <input type="hidden" name="id" value={m.u.id} />
          <input type="hidden" name="back" value={back} />
          <span className="text-sm font-bold text-[#7a4d06]">Waiting for ward confirmation</span>
          <SubmitButton pendingText="…" className="h-10 rounded-full bg-ink px-4 text-[13px] font-bold text-white">
            Confirm
          </SubmitButton>
        </form>
      ) : (
        <p className="rounded-[14px] bg-[#ddf3e4] px-3.5 py-3 text-sm font-bold text-[#1b6b3a]">
          Confirmed{m.confirmer ? ` by ${m.confirmer}` : ""}
          {m.u.confirmedAt ? ` on ${day.format(m.u.confirmedAt)}` : ""}
        </p>
      )}
      <dl className="rounded-[14px] border border-line px-3.5 text-sm">
        {fact("Role", ROLE_LABEL[m.u.role])}
        {fact("Ward", m.u.ward)}
        {m.u.area && fact("Area", m.u.area)}
        {fact("Email", m.u.email ? `${m.u.email}${m.u.emailVerifiedAt ? " ✓" : " (not checked)"}` : "None")}
        {fact("Phone", `${full ? phone : "Hidden"}${m.u.phoneVerifiedAt ? " ✓" : " (not checked)"}`)}
        {fact("Signs in with", [m.u.googleSubject && "Google", m.u.passwordHash && "Email and password"].filter(Boolean).join(", ") || "—")}
        {fact("Invited by", m.inviter ? `${m.inviter.name} (code ${m.inviter.code})` : "Founder code")}
        {fact("Their invite code", m.u.inviteCode)}
        {fact("People they invited", m.invited)}
        {fact("Orders they made", m.bought)}
        {fact("Joined", day.format(m.u.createdAt))}
        {fact("Last sign-in", m.lastActive ? day.format(m.lastActive) : "—")}
      </dl>
      {m.shop?.id ? (
        <div className="rounded-[14px] border border-line px-3.5 py-3 text-sm">
          <p className="font-extrabold">{m.shop.name}</p>
          <p className="text-muted">
            {m.sold} {m.sold === 1 ? "order" : "orders"} · {m.shop.isOpen ? "Open" : m.u.suspendedAt ? "Closed while suspended" : waiting(m) ? "Not live yet" : "Closed"}
          </p>
          <Link href={`/s/${m.shop.slug}`} className="mt-2 inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold">
            See shop
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted">No shop yet.</p>
      )}
      {full && (
        <div className="flex gap-2">
          <a href={`tel:+${m.u.phone}`} className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold">
            Call
          </a>
          <a href={`https://wa.me/${m.u.phone}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold">
            WhatsApp
          </a>
        </div>
      )}
      {canManage && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <p className="text-xs font-extrabold text-muted">Admin</p>
          {!m.u.suspendedAt && (m.u.role === "member" || m.u.role === "ward_contact") && (m.u.confirmed || m.u.role === "ward_contact") && <RoleForm id={m.u.id} role={m.u.role} />}
          {!m.u.suspendedAt && <SuspendForm id={m.u.id} name={m.u.name} />}
        </div>
      )}
      {full && history.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-extrabold text-muted">History</p>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <b>{ACTION[h.action] ?? h.action}</b>
                  {h.detail ? `: ${h.detail}` : ""}
                  {h.by ? <span className="text-muted"> · by {h.by}</span> : null}
                </span>
                <span className="shrink-0 text-muted">{day.format(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const ACTION: Record<string, string> = { confirmed: "Confirmed", suspended: "Suspended", unsuspended: "Suspension lifted", role: "Role changed" };

// Members on a computer: filters, saved views, a side panel and bulk Confirm.
export async function MembersDesk({ sp, full, meId }: { sp: Params; full: boolean; meId: string }) {
  const [density, visible, { st, rows, total }, wards] = await Promise.all([getDensity("admin"), getColumns(MEMBERS_PAGE, MEMBER_COLUMN_IDS, MEMBER_DEFAULT), loadMembers(sp), wardList()]);
  const columns = memberColumns(full);
  const query = viewQuery(sp);
  const back = hrefWith(MEMBERS_PAGE, sp, {});
  const openRow = st.open ? rows.find((r) => r.u.id === st.open) : null;

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Members</h1>
        <span className="text-sm font-semibold text-muted">{total} shown</span>
      </div>
      <DataLayout
        panel={
          st.open && (
            <SidePanel title={openRow?.u.name ?? "Member"} sub={openRow ? `${ROLE_LABEL[openRow.u.role]} · ${openRow.u.ward}` : undefined} closeHref={hrefWith(MEMBERS_PAGE, sp, { open: null })}>
              <MemberView id={st.open} full={full} back={back} meId={meId} />
            </SidePanel>
          )
        }
      >
        <FilterBar
          path={MEMBERS_PAGE}
          sp={sp}
          page={MEMBERS_PAGE}
          search="Search name, email, phone or shop"
          filters={[
            { id: "status", label: "Status", options: STATUS_FILTER },
            { id: "role", label: "Role", options: ROLE_FILTER },
            { id: "ward", label: "Ward", options: wards.map((w) => ({ value: w, label: w })) },
            { id: "shop", label: "Shop", options: SHOP_FILTER },
            { id: "joined", label: "Joined", options: JOINED_FILTER },
          ]}
          presets={[
            { name: "Waiting for ward confirmation", query: "status=waiting" },
            { name: "New this week", query: "joined=week" },
          ]}
          tools={
            <>
              <ExportButton action={exportMembers} query={query} filename="vouchly-members" />
              <ColumnPicker page={MEMBERS_PAGE} columns={columns.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={MEMBER_DEFAULT} locked={["name"]} />
            </>
          }
        />
        <DataTable
          label="Members"
          path={MEMBERS_PAGE}
          sp={sp}
          state={st}
          columns={columns}
          visible={visible}
          rows={rows}
          rowId={(r) => r.u.id}
          rowLabel={(r) => r.u.name}
          total={total}
          density={density}
          selectable
          bulk={<BulkBar actions={[{ label: "Confirm", run: bulkConfirm, confirm: "Confirm {n} members? Their shops go live and each gets a message." }]} exportCsv={exportMembers} query={query} filename="vouchly-members" />}
          empty={query ? "No members match these filters." : "No members yet."}
        />
      </DataLayout>
    </main>
  );
}
