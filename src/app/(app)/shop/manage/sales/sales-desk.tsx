import Link from "next/link";
import { naira } from "@/lib/catalog";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { hrefWith, viewQuery, type Params } from "@/components/data/params";
import { loadSellerOrder, OrderDetail } from "../orders/[code]/order-detail";
import { loadSales, PAID_FILTER, PAYOUT_FILTER } from "./sales-query";
import { SALE_COLUMN_IDS, SALE_COLUMNS, SALE_DEFAULT, SALES_PAGE } from "./sale-columns";
import { exportSales } from "./table-actions";

type Shop = Parameters<typeof loadSellerOrder>[0];

// Every payment on a computer: filters, totals, a side panel with the order, and CSV.
export async function PaymentsDesk({ shop, sp, top }: { shop: Shop; sp: Params; top: React.ReactNode }) {
  const [density, visible, { st, rows, total, sum }] = await Promise.all([getDensity("seller"), getColumns(SALES_PAGE, SALE_COLUMN_IDS, SALE_DEFAULT), loadSales(shop.id, sp)]);
  const open = st.open ? await loadSellerOrder(shop, st.open) : null;
  const query = viewQuery(sp);

  return (
    <main className="hidden px-8 py-6 lg:block">
      <h1 className="mb-4 text-[26px] font-extrabold tracking-[-0.02em]">Sales</h1>
      {top}
      <DataLayout
        panel={
          open && (
            <SidePanel
              title={`Order ${open.o.code}`}
              sub={
                <Link href={`/shop/manage/orders/${open.o.code}`} className="font-bold text-accent">
                  Open full page
                </Link>
              }
              closeHref={hrefWith(SALES_PAGE, sp, { open: null })}
            >
              <div className="-mx-5 -my-4 flex min-h-full flex-col gap-4 bg-bg px-4 py-4">
                <OrderDetail data={open} />
              </div>
            </SidePanel>
          )
        }
      >
        <div className="mb-3 mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-lg font-extrabold">Payments</h2>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{total}</span> {total === 1 ? "payment" : "payments"} · buyers paid <span className="font-semibold text-ink">{naira(sum.paid)}</span> · you get{" "}
            <span className="font-semibold text-ink">{naira(sum.get)}</span>
            {sum.refunded > 0 && (
              <>
                {" "}
                · refunded <span className="font-semibold text-ink">{naira(sum.refunded)}</span>
              </>
            )}
          </p>
        </div>
        <FilterBar
          path={SALES_PAGE}
          sp={sp}
          page={SALES_PAGE}
          search="Search buyer or order code"
          filters={[
            {
              id: "paid",
              label: "Date paid",
              options: PAID_FILTER,
              custom: "date",
            },
            { id: "payout", label: "Payout", options: PAYOUT_FILTER },
          ]}
          presets={[
            { name: "Held", query: "payout=held" },
            { name: "This month", query: "paid=month" },
            { name: "Refunded", query: "payout=refunded" },
          ]}
          tools={
            <>
              <ExportButton action={exportSales} query={query} filename="vouchly-sales" />
              <ColumnPicker page={SALES_PAGE} columns={SALE_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={SALE_DEFAULT} locked={["code"]} />
            </>
          }
        />
        <DataTable
          label="Payments"
          path={SALES_PAGE}
          sp={sp}
          state={st}
          columns={SALE_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.code}
          rowLabel={(r) => `payment for order ${r.code}`}
          total={total}
          density={density}
          selectable
          bulk={<BulkBar actions={[]} exportCsv={exportSales} query={query} filename="vouchly-sales" />}
          empty={query.replace(/(^|&)p=[^&]*/, "") ? "No payments match these filters." : "No payments yet. They show here once a buyer pays."}
        />
      </DataLayout>
    </main>
  );
}
