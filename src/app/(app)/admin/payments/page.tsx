import { naira } from "@/lib/catalog";
import { BackBar } from "@/components/ui";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { viewQuery, type Params } from "@/components/data/params";
import { adminOnly } from "../admin-guard";
import { DATE_FILTER, loadPayments, PAY_STATUS, shopOptions } from "./payments-query";
import { PAYMENT_COLUMN_IDS, PAYMENT_COLUMNS, PAYMENT_DEFAULT, PAYMENTS_PAGE } from "./payment-columns";
import { exportPayments } from "./actions";

export const dynamic = "force-dynamic";

// Every payment, to check Paystack against Vouchly. Read-only.
export default async function AdminPayments({ searchParams }: { searchParams: Promise<Params> }) {
  await adminOnly();
  const sp = await searchParams;
  const [density, visible, { st, rows, total, sum }, shopList] = await Promise.all([getDensity("admin"), getColumns(PAYMENTS_PAGE, PAYMENT_COLUMN_IDS, PAYMENT_DEFAULT), loadPayments(sp), shopOptions()]);
  const query = viewQuery(sp);
  const totals = (
    <p className="text-sm text-muted">
      <span className="font-semibold text-ink">{total}</span> {total === 1 ? "payment" : "payments"} · paid in <span className="font-semibold text-ink">{naira(sum.amount)}</span> · Vouchly fees{" "}
      <span className="font-semibold text-ink">{naira(sum.fee)}</span>
      {sum.refunded > 0 && (
        <>
          {" "}
          · refunded <span className="font-semibold text-ink">{naira(sum.refunded)}</span>
        </>
      )}
    </p>
  );

  return (
    <>
      <main className="hidden px-8 py-6 lg:block">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Payments</h1>
          {totals}
        </div>
        <FilterBar
          path={PAYMENTS_PAGE}
          sp={sp}
          page={PAYMENTS_PAGE}
          search="Search Paystack reference or order code"
          filters={[
            { id: "status", label: "Status", options: PAY_STATUS },
            { id: "date", label: "Date", options: DATE_FILTER, custom: "date" },
            { id: "shop", label: "Shop", options: shopList },
          ]}
          presets={[
            { name: "Held", query: "status=held" },
            { name: "This month", query: "date=thismonth" },
            { name: "Refunded", query: "status=refunded" },
          ]}
          tools={
            <>
              <ExportButton action={exportPayments} query={query} filename="vouchly-payments" />
              <ColumnPicker page={PAYMENTS_PAGE} columns={PAYMENT_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={PAYMENT_DEFAULT} locked={["ref"]} />
            </>
          }
        />
        <DataTable
          label="Payments"
          path={PAYMENTS_PAGE}
          sp={sp}
          state={st}
          columns={PAYMENT_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.p.id}
          rowLabel={(r) => `payment ${r.p.paystackReference}`}
          total={total}
          density={density}
          canOpen={false}
          selectable
          bulk={<BulkBar actions={[]} exportCsv={exportPayments} query={query} filename="vouchly-payments" />}
          empty={query ? "No payments match these filters." : "No payments yet."}
        />
      </main>
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Payments" href="/admin/members" />
        <div className="flex flex-col gap-2.5 px-4">
          {totals}
          <p className="text-[13px] text-muted">The full table and CSV are on a computer. Here are the latest.</p>
          {rows.map((r) => (
            <div key={r.p.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {r.code} · {r.shop}
                </span>
                <span className="block truncate font-mono text-[11px] text-muted">{r.p.paystackReference}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-extrabold tabular-nums">{naira(r.p.amountKobo)}</span>
                <span className="block text-xs font-semibold text-muted">{r.p.status.replace("_", " ")}</span>
              </span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
