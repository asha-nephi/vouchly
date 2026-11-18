import Link from "next/link";
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
import { loadShops, SELLER_LABEL, STATUS_LABEL } from "./shops-query";
import { SHOP_COLUMN_IDS, SHOP_COLUMNS, SHOP_DEFAULT, SHOPS_PAGE } from "./shop-columns";
import { exportShops } from "./actions";

export const dynamic = "force-dynamic";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

// Every shop on Vouchly, read-only. Computers get a table; phones a short list.
export default async function AdminShops({ searchParams }: { searchParams: Promise<Params> }) {
  await adminOnly();
  const sp = await searchParams;
  const [density, visible, { st, rows, total, sum }] = await Promise.all([getDensity("admin"), getColumns(SHOPS_PAGE, SHOP_COLUMN_IDS, SHOP_DEFAULT), loadShops(sp)]);
  const query = viewQuery(sp);

  return (
    <>
      <main className="hidden px-8 py-6 lg:block">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Shops</h1>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{total}</span> shown · this month: <span className="font-semibold text-ink">{sum.orders}</span> orders, <span className="font-semibold text-ink">{naira(sum.sales)}</span> in sales
          </p>
        </div>
        <FilterBar
          path={SHOPS_PAGE}
          sp={sp}
          page={SHOPS_PAGE}
          search="Search shop, owner or ward"
          filters={[
            { id: "status", label: "Status", options: opts(STATUS_LABEL) },
            { id: "type", label: "Seller type", options: opts(SELLER_LABEL) },
            { id: "payout", label: "Payout account", options: [{ value: "yes", label: "Set" }, { value: "no", label: "Not set" }] },
            { id: "sold", label: "Orders this month", options: [{ value: "yes", label: "Some" }, { value: "no", label: "None" }] },
          ]}
          presets={[
            { name: "No payout account", query: "payout=no" },
            { name: "No orders this month", query: "sold=no&status=open" },
          ]}
          tools={
            <>
              <ExportButton action={exportShops} query={query} filename="vouchly-shops" />
              <ColumnPicker page={SHOPS_PAGE} columns={SHOP_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={SHOP_DEFAULT} locked={["name"]} />
            </>
          }
        />
        <DataTable
          label="Shops"
          path={SHOPS_PAGE}
          sp={sp}
          state={st}
          columns={SHOP_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.s.id}
          rowLabel={(r) => r.s.name}
          total={total}
          density={density}
          canOpen={false}
          selectable
          bulk={<BulkBar actions={[]} exportCsv={exportShops} query={query} filename="vouchly-shops" />}
          empty={query ? "No shops match these filters." : "No shops yet."}
        />
      </main>
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Shops" href="/admin/members" />
        <div className="flex flex-col gap-2.5 px-4">
          <p className="text-[13px] text-muted">The full table is on a computer. Here are the newest shops.</p>
          {rows.map((r) => (
            <Link key={r.s.id} href={`/s/${r.s.slug}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{r.s.name}</span>
                <span className="block truncate text-xs text-muted">
                  {r.owner} · {STATUS_LABEL[r.status]}
                  {r.payout ? "" : " · no payout account"}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-semibold text-muted">{r.orders} this month</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
