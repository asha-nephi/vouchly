import { desc, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { orderItems, orders, payments, shops, users } from "@/db/schema";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel, shortDateTime, telLink, waLink } from "@/lib/orders";
import { PROBLEMS, timeline } from "@/lib/order-status";
import { Note } from "@/components/ui";
import { DataTable, Pill, type Column } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { getDensity } from "@/components/data/density";
import { flat, hrefWith, tableState, viewQuery, type Params } from "@/components/data/params";
import ResolveForm from "./resolve-form";

const PAGE = "/admin/problems";
const DAY = 86400_000;
const opened = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

// Every order that ever had a problem reported, newest first.
async function problems() {
  const seller = alias(users, "seller");
  const rows = await db
    .select({ o: orders, shop: shops.name, buyer: users.name, buyerPhone: users.phone, seller: seller.name, sellerPhone: seller.phone })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .innerJoin(seller, eq(seller.id, shops.ownerId))
    .where(isNotNull(orders.problemAt))
    .orderBy(desc(orders.problemAt))
    .limit(1000);
  const now = Date.now();
  return rows.map((r) => {
    const open = r.o.status === "disputed";
    const state: "open" | "refunded" | "closed" = open ? "open" : r.o.status === "cancelled" ? "refunded" : "closed";
    const reason = PROBLEMS.find((p) => r.o.problem?.startsWith(p.label))?.label ?? "Something else";
    return { ...r, state, reason, amount: r.o.itemsKobo + r.o.deliveryFeeKobo, days: open ? Math.floor((now - r.o.problemAt!.getTime()) / DAY) : null };
  });
}
type Row = Awaited<ReturnType<typeof problems>>[number];

const STATE = { open: { label: "Open", tone: "red" }, refunded: { label: "Refunded", tone: "grey" }, closed: { label: "Seller kept it", tone: "green" } } as const;

const COLUMNS: Column<Row>[] = [
  { id: "opened", label: "Opened", sortable: true, cell: (r) => <span className="text-muted">{opened.format(r.o.problemAt!).replace(",", "")}</span> },
  { id: "code", label: "Order", cell: (r) => <span className="font-bold">{r.o.code}</span> },
  { id: "buyer", label: "Buyer", cell: (r) => <span className="block max-w-[150px] truncate">{r.buyer}</span> },
  { id: "seller", label: "Seller", cell: (r) => <span className="block max-w-[180px] truncate">{r.shop}</span> },
  { id: "reason", label: "Reason", cell: (r) => r.reason },
  { id: "amount", label: "Amount", sortable: true, money: true, cell: (r) => naira(r.amount) },
  { id: "status", label: "Status", cell: (r) => <Pill tone={STATE[r.state].tone}>{STATE[r.state].label}</Pill> },
  { id: "days", label: "Days open", sortable: true, align: "right", cell: (r) => (r.days === null ? <span className="text-[#b4bccb]">—</span> : <span className={`tabular-nums font-bold ${r.days >= 2 ? "text-[#b42318]" : ""}`}>{r.days}</span>) },
];

// One problem in the side panel: what was reported, the timeline, both people, and what to do.
async function ProblemView({ r }: { r: Row }) {
  const o = r.o;
  const [items, [pay]] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, o.id)), db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)).limit(1)]);
  // A problem is reported instead of "received", so the last step stays open.
  const steps = timeline(o.status === "disputed" ? "ready" : o.status === "cancelled" ? "paid" : o.status, o.method).map((s) =>
    o.status === "disputed" && s.state === "now" ? { ...s, state: "done" } : s,
  );
  const person = (label: string, name: string, phone: string) => (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span>
        <span className="text-muted">{label}:</span> <b>{name}</b>
      </span>
      <span className="flex gap-1.5">
        <a href={telLink(phone)} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
          Call
        </a>
        <a href={waLink(phone, `Hi ${name.split(" ")[0]}, it's Vouchly about order ${o.code}.`)} target="_blank" rel="noreferrer" className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
          WhatsApp
        </a>
      </span>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs font-extrabold text-muted">What the buyer said · {shortDateTime(o.problemAt!)}</p>
        <p className="rounded-[14px] bg-[#fbebeb] px-3 py-2.5 text-[13px] text-[#5c1a12]">{o.problem}</p>
      </div>
      {o.problemResolution && (
        <div>
          <p className="mb-1 text-xs font-extrabold text-muted">How it was settled</p>
          <p className="rounded-[14px] bg-[#ddf3e4] px-3 py-2.5 text-[13px] text-[#1b4d2e]">{o.problemResolution}</p>
        </div>
      )}
      <div className="rounded-[14px] border border-line px-3.5 py-2">
        {person("Buyer", r.buyer, r.buyerPhone)}
        {person("Seller", `${r.seller} (${r.shop})`, r.sellerPhone)}
      </div>
      <div className="rounded-[14px] border border-line px-3.5 py-3 text-sm">
        {items.map((i) => (
          <p key={i.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {i.quantity} × {[i.name, i.size].filter(Boolean).join(", ")}
            </span>
            <span className="tabular-nums">{naira(i.priceKobo * i.quantity)}</span>
          </p>
        ))}
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
          <span>Paid</span>
          <span className="tabular-nums">{naira(r.amount)}</span>
        </p>
        <p className="text-xs text-muted">
          {deliveryDayLabel(o.deliveryDay)} · Payment {pay ? pay.status.replace("_", " ") : "not found"}
        </p>
      </div>
      <ol className="flex flex-col gap-1.5 text-[13px]">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${s.state === "next" ? "bg-[#d5dae4]" : "bg-accent"}`} />
            <span className={s.state === "next" ? "text-muted" : "font-semibold"}>{s.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${r.state === "open" ? "bg-[#b42318]" : "bg-[#1b6b3a]"}`} />
          <span className="font-semibold">{r.state === "open" ? "Problem reported, waiting for you" : STATE[r.state].label}</span>
        </li>
      </ol>
      {r.state === "open" && (
        <div>
          <Note>Talk to both sides first. Refunding sends the buyer all their money back through Paystack.</Note>
          <ResolveForm id={o.id} />
        </div>
      )}
    </div>
  );
}

// Problems on a computer: open ones first, with the order and both sides in a side panel.
export async function ProblemsDesk({ sp }: { sp: Params }) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["opened", "amount", "days"], sort: "opened" });
  const [density, all] = await Promise.all([getDensity("admin"), problems()]);
  let rows = all;
  if (f.status === "open" || f.status === "refunded" || f.status === "closed") rows = rows.filter((r) => r.state === f.status);
  if (f.old === "yes") rows = rows.filter((r) => r.days !== null && r.days >= 2);
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter((r) => [r.o.code, r.buyer, r.shop, r.seller].some((x) => x.toLowerCase().includes(q)));
  }
  const key: Record<string, (r: Row) => number> = { opened: (r) => r.o.problemAt!.getTime(), amount: (r) => r.amount, days: (r) => r.days ?? -1 };
  const by = key[st.sort] ?? key.opened;
  rows.sort((a, b) => (by(a) - by(b)) * (st.dir === "asc" ? 1 : -1) || a.o.code.localeCompare(b.o.code));
  const open = st.open ? all.find((r) => r.o.code === st.open) : null;
  const openCount = all.filter((r) => r.state === "open").length;

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Problems</h1>
        <span className="text-sm font-semibold text-muted">
          {openCount} open · {rows.length} shown
        </span>
      </div>
      <DataLayout
        panel={
          open && (
            <SidePanel title={`Order ${open.o.code}`} sub={`${open.shop} · ${naira(open.amount)}`} closeHref={hrefWith(PAGE, sp, { open: null })}>
              <ProblemView r={open} />
            </SidePanel>
          )
        }
      >
        <FilterBar
          path={PAGE}
          sp={sp}
          page={PAGE}
          search="Search order, buyer or shop"
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { value: "open", label: "Open" },
                { value: "refunded", label: "Refunded" },
                { value: "closed", label: "Seller kept it" },
              ],
            },
            { id: "old", label: "Age", options: [{ value: "yes", label: "Open 2 days or more" }] },
          ]}
          presets={[
            { name: "Open", query: "status=open" },
            { name: "Open 2+ days", query: "old=yes&status=open" },
          ]}
        />
        <DataTable
          label="Problems"
          path={PAGE}
          sp={sp}
          state={st}
          columns={COLUMNS}
          rows={rows.slice(st.offset, st.offset + st.per)}
          rowId={(r) => r.o.code}
          rowLabel={(r) => `problem on order ${r.o.code}`}
          total={rows.length}
          density={density}
          empty={viewQuery(sp) ? "No problems match these filters." : "No problems reported yet."}
        />
      </DataLayout>
    </main>
  );
}
