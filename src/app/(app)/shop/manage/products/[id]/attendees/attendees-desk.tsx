import Link from "next/link";
import { eventWhen } from "@/lib/listings";
import { DataTable } from "@/components/data/data-table";
import { FilterBar } from "@/components/data/filter-bar";
import { ColumnPicker } from "@/components/data/column-picker";
import { BulkBar } from "@/components/data/bulk-bar";
import { ExportButton } from "@/components/data/export-button";
import { getDensity } from "@/components/data/density";
import { getColumns } from "@/components/data/views";
import { viewQuery, type Params } from "@/components/data/params";
import { loadAttendees, SHOW_FILTER } from "./attendees-query";
import { ATTENDEE_COLUMN_IDS, ATTENDEE_COLUMNS, ATTENDEE_DEFAULT, ATTENDEES_PAGE } from "./attendee-columns";
import { bulkCheckIn, bulkMessage, exportAttendees } from "./table-actions";
import MessageForm from "./message-form";

type Event = { id: string; name: string; seats: number | null; eventAt: Date | null };

// Who's coming, on a computer: search for the door, tick people in, message the ones you pick.
export async function AttendeesDesk({ p, sp, buyers }: { p: Event; sp: Params; buyers: number }) {
  const path = `/shop/manage/products/${p.id}/attendees`;
  const [density, visible, { st, rows, total, counts }] = await Promise.all([getDensity("seller"), getColumns(ATTENDEES_PAGE, ATTENDEE_COLUMN_IDS, ATTENDEE_DEFAULT), loadAttendees(p.id, sp)]);
  const query = viewQuery(sp);
  const csv = exportAttendees.bind(null, p.id);
  const stat = (n: React.ReactNode, label: string) => (
    <div className="rounded-[14px] bg-white/10 px-4 py-2.5">
      <p className="text-xl font-extrabold tabular-nums">{n}</p>
      <p className="text-xs text-[#c9d1e3]">{label}</p>
    </div>
  );

  return (
    <main className="hidden px-8 py-6 lg:block">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-ink px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#afc0ff]">Who&apos;s coming</p>
          <h1 className="truncate text-[22px] font-extrabold tracking-[-0.01em]">{p.name}</h1>
          <p className="text-[13px] text-[#c9d1e3]">{eventWhen(p.eventAt)}</p>
        </div>
        <div className="flex gap-2 text-center">
          {stat(p.seats ? `${counts.tickets} of ${p.seats}` : counts.tickets, "tickets sold")}
          {stat(counts.in, "checked in")}
          {stat(Math.max(0, counts.tickets - counts.in), "still to come")}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/shop/manage/products/${p.id}`} className="font-bold text-muted hover:text-ink">
          ← Edit event
        </Link>
        {buyers > 0 && (
          <details className="ml-auto w-full max-w-[460px] [&[open]]:w-full">
            <summary className="ml-auto flex h-9 w-fit cursor-pointer list-none items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold [&::-webkit-details-marker]:hidden">Message everyone ({buyers})</summary>
            <div className="mt-2">
              <MessageForm id={p.id} count={buyers} />
            </div>
          </details>
        )}
      </div>
      <FilterBar
        path={path}
        sp={sp}
        page={ATTENDEES_PAGE}
        search="Search name, phone or ticket code"
        filters={[{ id: "show", label: "Show", options: SHOW_FILTER }]}
        presets={[
          { name: "Not checked in", query: "show=out" },
          { name: "Checked in", query: "show=in" },
          { name: "Not paid yet", query: "show=unpaid" },
        ]}
        tools={
          <>
            <ExportButton action={csv} query={query} filename="vouchly-attendees" />
            <ColumnPicker page={ATTENDEES_PAGE} columns={ATTENDEE_COLUMNS.map(({ id, label }) => ({ id, label }))} visible={visible} fallback={ATTENDEE_DEFAULT} locked={["name"]} />
          </>
        }
      />
      <DataTable
        label="Attendees"
        path={path}
        sp={sp}
        state={st}
        columns={ATTENDEE_COLUMNS}
        visible={visible}
        rows={rows}
        rowId={(r) => r.code}
        rowLabel={(r) => `${r.name} (${r.code})`}
        total={total}
        density={density}
        canOpen={false}
        selectable
        bulk={
          <BulkBar
            actions={[
              { label: "Check in", run: bulkCheckIn.bind(null, p.id) },
              { label: "Message selected", run: bulkMessage.bind(null, p.id), write: { placeholder: "e.g. Doors open at 9:30. Bring your ticket code.", send: "Send to {n}" } },
            ]}
            exportCsv={csv}
            query={query}
            filename="vouchly-attendees"
          />
        }
        empty={query ? "No one matches. Check the spelling, or try the ticket code." : "No tickets yet. Share your event link to fill seats."}
      />
    </main>
  );
}
