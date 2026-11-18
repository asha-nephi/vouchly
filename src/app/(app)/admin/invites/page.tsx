import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BackBar } from "@/components/ui";
import { DataTable, Pill, type Column } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { getDensity } from "@/components/data/density";
import { flat, tableState, viewQuery, type Params } from "@/components/data/params";
import { adminOnly } from "../admin-guard";

export const dynamic = "force-dynamic";

const PAGE = "/admin/invites";
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });
const MEMBERS = ["member", "ward_contact", "admin"] as const;

// Each member has one invite code. A row per code: who owns it, who used it and when.
async function invites() {
  const joiner = alias(users, "joiner");
  const [owners, uses, founder] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, ward: users.ward, code: users.inviteCode, confirmed: users.confirmed, role: users.role, at: users.createdAt })
      .from(users)
      .where(and(eq(users.isGuest, false), inArray(users.role, [...MEMBERS]))),
    db
      .select({ by: joiner.invitedById, name: joiner.name, at: joiner.createdAt })
      .from(joiner)
      .where(and(isNotNull(joiner.invitedById), eq(joiner.isGuest, false)))
      .orderBy(desc(joiner.createdAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(isNull(users.invitedById), eq(users.isGuest, false), inArray(users.role, [...MEMBERS]))),
  ]);
  const rows = owners.map((o) => {
    const mine = uses.filter((u) => u.by === o.id);
    // A code only works once its owner is confirmed.
    const live = o.role !== "member" || o.confirmed;
    return { ...o, used: mine.length, names: mine.map((u) => u.name), lastAt: mine[0]?.at ?? null, live };
  });
  return { rows, founder: founder[0].n };
}
type Row = Awaited<ReturnType<typeof invites>>["rows"][number];

const COLUMNS: Column<Row>[] = [
  { id: "code", label: "Code", cell: (r) => <span className="font-mono text-[13px] font-bold">{r.code}</span> },
  { id: "owner", label: "Created by", sortable: true, cell: (r) => <span className="block max-w-[180px] truncate font-semibold">{r.name}</span> },
  { id: "ward", label: "Ward", cell: (r) => <span className="block max-w-[150px] truncate text-muted">{r.ward}</span> },
  { id: "used", label: "Times used", sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-bold">{r.used || <span className="font-normal text-[#b4bccb]">0</span>}</span> },
  {
    id: "by",
    label: "Used by",
    wrap: true,
    cell: (r) =>
      r.used ? (
        <span className="block max-w-[260px] truncate xl:max-w-[360px]" title={r.names.join(", ")}>
          {r.names.slice(0, 3).join(", ")}
          {r.used > 3 ? ` +${r.used - 3} more` : ""}
        </span>
      ) : (
        <span className="text-[#b4bccb]">—</span>
      ),
  },
  { id: "last", label: "Last used on", sortable: true, cell: (r) => <span className="text-muted">{r.lastAt ? day.format(r.lastAt) : "—"}</span> },
  { id: "status", label: "Status", cell: (r) => (r.live ? <Pill tone="green">Works</Pill> : <Pill tone="amber">Owner not confirmed</Pill>) },
];

// Invite codes, read-only.
export default async function AdminInvites({ searchParams }: { searchParams: Promise<Params> }) {
  await adminOnly();
  const sp = await searchParams;
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["owner", "used", "last"], sort: "last" });
  const [density, { rows: all, founder }] = await Promise.all([getDensity("admin"), invites()]);
  let rows = all;
  if (f.used === "yes") rows = rows.filter((r) => r.used > 0);
  if (f.used === "no") rows = rows.filter((r) => r.used === 0);
  if (f.status === "works") rows = rows.filter((r) => r.live);
  if (f.status === "waiting") rows = rows.filter((r) => !r.live);
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter((r) => [r.code, r.name, r.ward, ...r.names].some((x) => x.toLowerCase().includes(q)));
  }
  const key: Record<string, (r: Row) => number | string> = { owner: (r) => r.name.toLowerCase(), used: (r) => r.used, last: (r) => r.lastAt?.getTime() ?? 0 };
  const by = key[st.sort] ?? key.last;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    return x === y ? b.at.getTime() - a.at.getTime() : (x < y ? -1 : 1) * (st.dir === "asc" ? 1 : -1);
  });
  const joined = all.reduce((n, r) => n + r.used, 0);
  const summary = (
    <p className="text-sm text-muted">
      <span className="font-semibold text-ink">{joined}</span> joined with a member&apos;s code · <span className="font-semibold text-ink">{founder}</span> with the founder code
    </p>
  );

  return (
    <>
      <main className="hidden px-8 py-6 lg:block">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Invites</h1>
          {summary}
        </div>
        <FilterBar
          path={PAGE}
          sp={sp}
          page={PAGE}
          search="Search code, member or ward"
          filters={[
            { id: "used", label: "Used", options: [{ value: "yes", label: "Used at least once" }, { value: "no", label: "Never used" }] },
            { id: "status", label: "Status", options: [{ value: "works", label: "Works" }, { value: "waiting", label: "Owner not confirmed" }] },
          ]}
          presets={[{ name: "Used", query: "used=yes" }]}
        />
        <DataTable
          label="Invites"
          path={PAGE}
          sp={sp}
          state={st}
          columns={COLUMNS}
          rows={rows.slice(st.offset, st.offset + st.per)}
          rowId={(r) => r.id}
          rowLabel={(r) => `code ${r.code}`}
          total={rows.length}
          density={density}
          canOpen={false}
          empty={viewQuery(sp) ? "No codes match these filters." : "No members yet."}
        />
      </main>
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Invites" href="/admin/members" />
        <div className="flex flex-col gap-2.5 px-4">
          {summary}
          {rows
            .filter((r) => r.used > 0)
            .map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {r.code} · {r.names.slice(0, 2).join(", ")}
                    {r.used > 2 ? ` +${r.used - 2}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums">{r.used}</span>
              </div>
            ))}
        </div>
      </main>
    </>
  );
}
