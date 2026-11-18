import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eventWhen } from "@/lib/listings";
import { telLink, waLink } from "@/lib/orders";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import type { Params } from "@/components/data/params";
import { myEvent, PAID } from "./attendees-query";
import { AttendeesDesk } from "./attendees-desk";
import CheckInBox from "./check-in-box";
import MessageForm from "./message-form";

export const dynamic = "force-dynamic";

export default async function Attendees({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  const p = await myEvent(shop.id, id);
  if (!p) notFound();
  const sp = await searchParams;
  const rows = await db
    .select({ code: orders.code, qty: orderItems.quantity, name: users.name, phone: users.phone, ward: users.ward, checkedInAt: orders.checkedInAt })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orderItems.productId, p.id), eq(orders.method, "event"), inArray(orders.status, [...PAID])))
    .orderBy(asc(users.name));
  const sold = rows.reduce((n, r) => n + r.qty, 0);
  const inside = rows.filter((r) => r.checkedInAt).reduce((n, r) => n + r.qty, 0);
  const buyers = new Set(rows.map((r) => r.phone)).size;

  return (
    <>
      <AttendeesDesk p={p} sp={sp} buyers={buyers} />
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Who's coming" href={`/shop/manage/products/${p.id}`} />
        <div className="flex flex-col gap-4 px-4">
          <section className="rounded-[20px] bg-ink p-4 text-white">
            <p className="text-lg font-extrabold">{p.name}</p>
            <p className="text-[13px] text-[#c9d1e3]">{eventWhen(p.eventAt)}</p>
            <p className="mt-2 text-2xl font-extrabold">
              {sold} <span className="text-base font-semibold text-[#c9d1e3]">of {p.seats} seats taken</span>
            </p>
            {inside > 0 && <p className="text-[13px] font-semibold text-[#afc0ff]">{inside} checked in</p>}
          </section>
          {rows.length > 0 && <MessageForm id={p.id} count={buyers} />}
          {rows.length === 0 ? (
            <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center text-sm text-muted">No tickets yet. Share your event link to fill seats.</p>
          ) : (
            <section className="rounded-[20px] bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              {rows.map((r) => (
                <div key={r.code} className="border-b border-[#eef0f4] py-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{r.name}</span>
                      <span className="block text-xs text-muted">
                        {r.qty} {r.qty === 1 ? "ticket" : "tickets"}, code {r.code}
                        {r.ward !== "Guest" ? `, ${r.ward}` : ""}
                      </span>
                    </span>
                    <CheckInBox pid={p.id} code={r.code} name={r.name} on={!!r.checkedInAt} big />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a href={telLink(r.phone)} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
                      Call
                    </a>
                    <a href={waLink(r.phone)} target="_blank" rel="noreferrer" className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
