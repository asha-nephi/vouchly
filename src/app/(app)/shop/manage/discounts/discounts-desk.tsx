import Link from "next/link";
import { naira } from "@/lib/catalog";
import { statusLabel } from "@/lib/order-status";
import SubmitButton from "@/components/submit-button";
import { DataTable, Pill } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { hrefWith, viewQuery, type Params } from "@/components/data/params";
import { loadDiscounts, ordersWithCode, STATUS_FILTER, TYPE_FILTER, type DiscountRow } from "./discounts-query";
import { DISCOUNT_COLUMN_IDS, DISCOUNT_COLUMNS, DISCOUNT_DEFAULT, DISCOUNTS_PAGE, offText, STATUS, usedText } from "./discount-columns";
import { bulkOff, bulkOn, exportDiscounts } from "./table-actions";
import { toggleDiscount } from "./actions";
import DiscountForm from "./discount-form";

const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// One code in the side panel: its facts, the on/off button and the orders that used it.
async function CodeView({ shopId, r }: { shopId: string; r: DiscountRow }) {
  const list = await ordersWithCode(shopId, r.c.code);
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
        {r.status !== "finished" && (
          <form action={toggleDiscount}>
            <input type="hidden" name="id" value={r.c.id} />
            <SubmitButton pendingText="…" className="h-9 rounded-full border border-[#d5dae4] bg-white px-3.5 text-[13px] font-bold">
              {r.c.isActive ? "Turn off" : "Turn on"}
            </SubmitButton>
          </form>
        )}
      </div>
      <dl className="rounded-[14px] border border-line px-3.5 text-sm">
        {fact("Discount", offText(r))}
        {fact("Used", r.c.maxUses !== null ? `${usedText(r)} times` : `${r.c.used} ${r.c.used === 1 ? "time" : "times"}, no limit`)}
        {fact("Ends", r.c.endsAt ? lagos.format(r.c.endsAt) : "No end date")}
        {fact("Discount given", naira(r.given))}
        {fact("Sales with this code", naira(r.sales))}
        {fact("Created", lagos.format(r.c.createdAt))}
      </dl>
      <div>
        <p className="mb-2 text-[15px] font-extrabold">Orders that used it</p>
        {list.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
        <ul className="flex flex-col">
          {list.map((o) => (
            <li key={o.code} className="border-b border-line last:border-b-0">
              <Link href={`/shop/manage/orders/${o.code}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-[#F7F8FA]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {o.buyer}
                    {o.guest && <span className="ml-1.5 rounded-full bg-chip px-1.5 text-[11px] font-bold text-muted">Guest</span>}
                  </span>
                  <span className="block text-xs text-muted">
                    {o.code} · {lagos.format(o.at)} · {statusLabel(o.status, o.method, true)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold tabular-nums">{naira(o.items)}</span>
                  <span className="block text-xs text-muted tabular-nums">−{naira(o.discount)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Discount codes on a computer: a table with filters, a side panel and bulk on/off.
export async function DiscountsDesk({ shopId, sp }: { shopId: string; sp: Params }) {
  const [density, visible, { st, rows, total }] = await Promise.all([getDensity("seller"), getColumns(DISCOUNTS_PAGE, DISCOUNT_COLUMN_IDS, DISCOUNT_DEFAULT), loadDiscounts(shopId, sp)]);
  const making = st.open === "new";
  const open = st.open && !making ? (await loadDiscounts(shopId, {}, { all: true, ids: [st.open] })).rows[0] : null;
  const query = viewQuery(sp);
  const close = hrefWith(DISCOUNTS_PAGE, sp, { open: null });
  const newHref = hrefWith(DISCOUNTS_PAGE, sp, { open: "new" });

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Discount codes</h1>
          <span className="text-sm font-semibold text-muted">{total} shown</span>
        </div>
        <Link href={newHref} scroll={false} className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
          + New code
        </Link>
      </div>
      <DataLayout
        panel={
          making ? (
            <SidePanel title="New code" sub="Buyers type it when they pay. Vouchly's 5% is worked out on the lower price." closeHref={close}>
              <div className="-mx-5 -my-4 bg-bg px-4 py-4">
                <DiscountForm />
              </div>
            </SidePanel>
          ) : (
            open && (
              <SidePanel title={open.c.code} sub={offText(open)} closeHref={close}>
                <CodeView shopId={shopId} r={open} />
              </SidePanel>
            )
          )
        }
      >
        <FilterBar
          path={DISCOUNTS_PAGE}
          sp={sp}
          page={DISCOUNTS_PAGE}
          search="Search codes"
          filters={[
            { id: "status", label: "Status", options: STATUS_FILTER },
            { id: "type", label: "Type", options: TYPE_FILTER },
          ]}
          presets={[
            { name: "On", query: "status=on" },
            { name: "Finished", query: "status=finished" },
          ]}
          tools={
            <>
              <ExportButton action={exportDiscounts} query={query} filename="vouchly-discounts" />
              <ColumnPicker page={DISCOUNTS_PAGE} columns={DISCOUNT_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={DISCOUNT_DEFAULT} locked={["code"]} />
            </>
          }
        />
        <DataTable
          label="Discount codes"
          path={DISCOUNTS_PAGE}
          sp={sp}
          state={st}
          columns={DISCOUNT_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.c.id}
          rowLabel={(r) => `code ${r.c.code}`}
          total={total}
          density={density}
          selectable
          bulk={
            <BulkBar
              actions={[
                { label: "Switch off", run: bulkOff, confirm: "Switch off {n} codes? Buyers can't use them until you switch them on." },
                { label: "Switch on", run: bulkOn },
              ]}
              exportCsv={exportDiscounts}
              query={query}
              filename="vouchly-discounts"
            />
          }
          empty={
            query ? (
              "No codes match these filters."
            ) : (
              <>
                No codes yet.{" "}
                <Link href={newHref} className="font-bold text-accent">
                  Make your first one
                </Link>
                .
              </>
            )
          }
        />
      </DataLayout>
    </main>
  );
}
