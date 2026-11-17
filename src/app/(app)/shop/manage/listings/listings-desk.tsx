import Link from "next/link";
import { naira } from "@/lib/catalog";
import { KIND_LABEL, listingLine, priceText } from "@/lib/listings";
import TilePhoto from "@/components/tile-photo";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { hrefWith, viewQuery, type Params } from "@/components/data/params";
import { KIND_FILTER, loadListings, SOLD_OUT_FILTER, SOLD_WEEK_FILTER, STATUS_FILTER, type ListingRow } from "./listings-query";
import { LISTING_COLUMN_IDS, LISTING_COLUMNS, LISTING_DEFAULT, LISTINGS_PAGE } from "./listing-columns";
import { bulkAddTo, bulkCopy, bulkOff, bulkOn, exportListings } from "./actions";
import { ActiveSwitch } from "./inline-edit";

// Quick view of one listing in the side panel.
function QuickView({ r, ai }: { r: ListingRow; ai: boolean }) {
  const p = r.p;
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <span className="shimmer relative size-24 shrink-0 overflow-hidden rounded-xl">
          <TilePhoto src={p.photos[0]} name={p.name} sizes="96px" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold leading-snug">{p.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">{listingLine(p) || KIND_LABEL[p.kind]}</p>
          <p className="mt-1.5 text-base font-extrabold">{priceText(p)}</p>
        </div>
      </div>
      <ActiveSwitch id={p.id} on={p.isActive} name={p.name} />
      <dl className="rounded-[14px] border border-line px-3.5">
        {fact("Kind", KIND_LABEL[p.kind])}
        {p.kind === "item" && fact("Stock", p.stock === null ? "No limit" : p.stock === 0 ? "Sold out" : `${p.stock} left`)}
        {p.kind === "event" && p.seats ? fact("Seats left", `${r.seatsLeft} of ${p.seats}`) : null}
        {fact("Sold this week", r.week)}
        {fact("Sold in all", r.all)}
        {r.waiting > 0 && fact("Waiting for it", r.waiting)}
        {fact("Collections", r.collections.map((c) => c.name).join(", ") || "None")}
        {fact("Photos", p.photos.length)}
        {fact("Updated", new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(p.updatedAt))}
      </dl>
      {p.about && <p className="line-clamp-5 whitespace-pre-line text-[13px] leading-relaxed text-[#1E2A4A]">{p.about}</p>}
      <div className="flex flex-wrap gap-2">
        <Link href={`/shop/manage/products/${p.id}`} className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
          Edit listing
        </Link>
        <Link href={`/p/${p.id}`} className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold">
          View as buyer
        </Link>
        {ai && p.isActive && (
          <Link href={`/shop/manage/products/${p.id}?post=1#post`} className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold">
            Make a post
          </Link>
        )}
        {p.kind === "event" && (
          <Link href={`/shop/manage/products/${p.id}/attendees`} className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold">
            Attendees
          </Link>
        )}
      </div>
    </div>
  );
}

// Listings on a computer: a table with filters, saved views, in-row editing, a side panel and bulk actions.
export async function ListingsDesk({ shopId, sp, ai, title }: { shopId: string; sp: Params; ai: boolean; title: string }) {
  const [density, visible, { st, rows, total, collections }] = await Promise.all([getDensity("seller"), getColumns(LISTINGS_PAGE, LISTING_COLUMN_IDS, LISTING_DEFAULT), loadListings(shopId, sp)]);
  const open = st.open ? (await loadListings(shopId, {}, { all: true, ids: [st.open] })).rows[0] : null;
  const query = viewQuery(sp);

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{title}</h1>
          <span className="text-sm font-semibold text-muted">{total} shown</span>
        </div>
        <Link href="/shop/manage/products/new" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
          + Add a listing
        </Link>
      </div>
      <DataLayout
        panel={
          open && (
            <SidePanel title={open.p.name} sub={`${KIND_LABEL[open.p.kind]} · ${open.p.priceType === "quote" ? "Price after a chat" : naira(open.p.priceKobo)}`} closeHref={hrefWith(LISTINGS_PAGE, sp, { open: null })}>
              <QuickView r={open} ai={ai} />
            </SidePanel>
          )
        }
      >
        <FilterBar
          path={LISTINGS_PAGE}
          sp={sp}
          page={LISTINGS_PAGE}
          search="Search listings"
          filters={[
            { id: "kind", label: "Kind", options: KIND_FILTER },
            { id: "status", label: "On or off", options: STATUS_FILTER },
            { id: "soldout", label: "Sold out", options: SOLD_OUT_FILTER },
            { id: "sold", label: "Sales this week", options: SOLD_WEEK_FILTER },
            ...(collections.length ? [{ id: "collection", label: "Collection", options: collections.map((c) => ({ value: c.id, label: c.name })) }] : []),
          ]}
          presets={[
            { name: "Sold out", query: "soldout=yes" },
            { name: "Hidden", query: "status=off" },
            { name: "Sold this week", query: "sold=yes&sort=week&dir=desc" },
          ]}
          tools={
            <>
              <ExportButton action={exportListings} query={query} filename="vouchly-listings" />
              <ColumnPicker page={LISTINGS_PAGE} columns={LISTING_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={LISTING_DEFAULT} locked={["name"]} />
            </>
          }
        />
        <DataTable
          label="Listings"
          path={LISTINGS_PAGE}
          sp={sp}
          state={st}
          columns={LISTING_COLUMNS}
          visible={visible}
          rows={rows}
          rowId={(r) => r.p.id}
          rowLabel={(r) => r.p.name}
          total={total}
          density={density}
          selectable
          bulk={
            <BulkBar
              actions={[
                { label: "Switch on", run: bulkOn },
                { label: "Switch off", run: bulkOff, confirm: "Hide {n} listings from buyers?" },
                ...(collections.length ? [{ label: "Add to collection", run: bulkAddTo, pick: collections.map((c) => ({ value: c.id, label: c.name })) }] : []),
                { label: "Copy", run: bulkCopy, confirm: "Make a hidden copy of {n} listings? (Up to 20 at a time.)" },
              ]}
              exportCsv={exportListings}
              query={query}
              filename="vouchly-listings"
            />
          }
          empty={
            query ? (
              "No listings match these filters."
            ) : (
              <>
                No listings yet.{" "}
                <Link href="/shop/manage/products/new" className="font-bold text-accent">
                  Add your first one
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
