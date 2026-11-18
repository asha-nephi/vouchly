import Link from "next/link";
import CopyButton from "@/components/data/copy-button";
import { DataTable, Pill, type Column } from "@/components/data/data-table";
import { DataLayout, SidePanel } from "@/components/data/side-panel";
import { getDensity } from "@/components/data/density";
import { hrefWith, tableState, type Params } from "@/components/data/params";
import { Note } from "@/components/ui";
import CollectionForm from "./collection-form";

export const COLLECTIONS_PAGE = "/shop/manage/collections";

type Row = { id: string; name: string; slug: string; inIt: number; forSale: number; link: string; createdAt: Date };
type Pick = { id: string; name: string; price: string; off: boolean };

const lagos = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "2-digit" });

const COLUMNS: Column<Row>[] = [
  {
    id: "name",
    label: "Name",
    sortable: true,
    cell: (r) => (
      <Link href={`${COLLECTIONS_PAGE}/${r.id}`} className="font-bold text-ink hover:text-accent hover:underline">
        {r.name}
      </Link>
    ),
  },
  { id: "listings", label: "Listings in it", sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.inIt}</span> },
  { id: "sale", label: "For sale now", align: "right", cell: (r) => <span className="tabular-nums">{r.forSale}</span> },
  {
    id: "link",
    label: "Link",
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className="max-w-[200px] truncate text-muted xl:max-w-[320px]">{r.link.replace(/^https?:\/\//, "")}</span>
        <CopyButton text={r.link} label={`Copy link for ${r.name}`} />
      </span>
    ),
  },
  { id: "status", label: "Status", cell: (r) => (r.forSale ? <Pill tone="green">Live</Pill> : <Pill tone="amber">Nothing for sale</Pill>) },
  { id: "created", label: "Created", sortable: true, cell: (r) => <span className="text-muted">{lagos.format(r.createdAt)}</span> },
];

// Collections on a computer: one row each, with its link. Opening a name shows its listings.
export async function CollectionsDesk({ sp, rows, picks, saved, deleted }: { sp: Params; rows: Row[]; picks: Pick[]; saved: boolean; deleted: boolean }) {
  const density = await getDensity("seller");
  const st = tableState(sp, { sorts: ["name", "listings", "created"], sort: "created", dir: "asc" });
  const key: Record<string, (r: Row) => number | string> = { name: (r) => r.name.toLowerCase(), listings: (r) => r.inIt, created: (r) => r.createdAt.getTime() };
  const by = key[st.sort] ?? key.created;
  const sorted = [...rows].sort((a, b) => {
    const x = by(a);
    const y = by(b);
    return x === y ? a.id.localeCompare(b.id) : (x < y ? -1 : 1) * (st.dir === "asc" ? 1 : -1);
  });
  const making = st.open === "new";
  const newHref = hrefWith(COLLECTIONS_PAGE, sp, { open: "new" });

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Collections</h1>
          <span className="text-sm font-semibold text-muted">{rows.length} of 20</span>
        </div>
        <Link href={newHref} scroll={false} className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
          + New collection
        </Link>
      </div>
      <DataLayout
        panel={
          making && (
            <SidePanel title="New collection" sub="Pick a name and tick what goes in it. It gets its own link." closeHref={hrefWith(COLLECTIONS_PAGE, sp, { open: null })}>
              <div className="-mx-5 -my-4 bg-bg px-4 py-4">
                <CollectionForm listings={picks} />
              </div>
            </SidePanel>
          )
        }
      >
        <div className="mb-3 flex flex-col gap-2">
          {saved && <Note tone="green">Collection saved. Copy its link below.</Note>}
          {deleted && <Note tone="green">Collection deleted.</Note>}
          <p className="text-sm text-muted">Group listings under a name, like &ldquo;Christmas gifts&rdquo;. Each one has its own link, so you can share just those.</p>
        </div>
        <DataTable
          label="Collections"
          path={COLLECTIONS_PAGE}
          sp={sp}
          state={st}
          columns={COLUMNS}
          rows={sorted.slice(st.offset, st.offset + st.per)}
          rowId={(r) => r.id}
          rowLabel={(r) => `collection ${r.name}`}
          total={rows.length}
          density={density}
          canOpen={false}
          empty={
            <>
              No collections yet.{" "}
              <Link href={newHref} className="font-bold text-accent">
                Make your first one
              </Link>
              .
            </>
          }
        />
      </DataLayout>
    </main>
  );
}
