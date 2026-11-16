import Link from "next/link";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { hrefWith, viewQuery, type Params } from "@/components/data/params";
import { DAY_FILTER, HOW, loadOrders, oneDay, PLACED_FILTER, STATUS_FILTER } from "./orders-query";
import { ORDER_COLUMN_IDS, ORDER_COLUMNS, ORDER_DEFAULT, ORDERS_PAGE } from "./order-columns";
import { loadSellerOrder, OrderDetail } from "./[code]/order-detail";
import { bulkConfirm, bulkReady } from "./actions";
import { exportOrders } from "./table-actions";

// Orders on a computer: a table with filters, saved views, a side panel and bulk actions.
export async function OrdersDesk({ shop, sp }: { shop: { id: string; name: string }; sp: Params }) {
  const [density, visible, { st, rows, total }] = await Promise.all([getDensity("seller"), getColumns(ORDERS_PAGE, ORDER_COLUMN_IDS, ORDER_DEFAULT), loadOrders(shop.id, sp)]);
  const open = st.open ? await loadSellerOrder(shop, st.open) : null;
  const query = viewQuery(sp);
  const day = oneDay(sp);
  const requests = sp.show === "requests" && !sp.status;

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{requests ? "Price requests" : "Orders"}</h1>
        <span className="text-sm font-semibold text-muted">{total} shown</span>
      </div>
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
              closeHref={hrefWith(ORDERS_PAGE, sp, { open: null })}
            >
              <div className="-mx-5 -my-4 flex min-h-full flex-col gap-4 bg-bg px-4 py-4">
                <OrderDetail data={open} />
              </div>
            </SidePanel>
          )
        }
      >
        <FilterBar
          path={ORDERS_PAGE}
          sp={sp}
          page={ORDERS_PAGE}
          search="Search buyer or order code"
          filters={[
            { id: "status", label: "Status", options: STATUS_FILTER },
            { id: "day", label: "Delivery or booking day", options: DAY_FILTER, custom: "date" },
            { id: "how", label: "How", options: [...HOW] },
            { id: "placed", label: "Date placed", options: PLACED_FILTER, custom: "date" },
          ]}
          presets={[
            { name: "Needs me now", query: "status=need" },
            { name: "This Saturday", query: "day=sat" },
            { name: "Paid, not ready", query: "status=notready" },
          ]}
          tools={
            <>
              {day && (
                <Link href={`/shop/manage/orders/day/${day}`} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold text-ink">
                  Print day list
                </Link>
              )}
              <ExportButton action={exportOrders} query={query} filename="vouchly-orders" />
              <ColumnPicker page={ORDERS_PAGE} columns={ORDER_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={ORDER_DEFAULT} locked={["code"]} />
            </>
          }
        />
        <DataTable
          label="Orders"
          path={ORDERS_PAGE}
          sp={sp}
          state={st}
          columns={ORDER_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.order.code}
          rowLabel={(r) => `order ${r.order.code}`}
          total={total}
          density={density}
          selectable
          bulk={
            <BulkBar
              actions={[
                { label: "Confirm", run: bulkConfirm },
                { label: "Mark ready (pickup)", run: bulkReady, confirm: "Mark {n} orders ready for pickup? Each buyer gets a message." },
              ]}
              exportCsv={exportOrders}
              query={query}
              filename="vouchly-orders"
            />
          }
          empty={query ? "No orders match these filters." : "No orders yet. New ones will show here."}
        />
      </DataLayout>
    </main>
  );
}
