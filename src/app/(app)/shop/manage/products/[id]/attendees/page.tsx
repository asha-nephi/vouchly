import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eventWhen } from "@/lib/listings";
import { telLink, waLink } from "@/lib/orders";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import MessageForm from "./message-form";

export const dynamic = "force-dynamic";

export default async function Attendees({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.kind, "event"))).limit(1);
  if (!p) notFound();
  const rows = await db
    .select({ code: orders.code, qty: orderItems.quantity, name: users.name, phone: users.phone, ward: users.ward })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orderItems.productId, p.id), eq(orders.method, "event"), inArray(orders.status, ["ready", "received", "disputed"])))
    .orderBy(asc(users.name));
  const sold = rows.reduce((n, r) => n + r.qty, 0);
  const buyers = new Set(rows.map((r) => r.phone)).size;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Who's coming" href={`/shop/manage/products/${p.id}`} />
      <div className="flex flex-col gap-4 px-4">
        <section className="rounded-[20px] bg-ink p-4 text-white">
          <p className="text-lg font-extrabold">{p.name}</p>
          <p className="text-[13px] text-[#c9d1e3]">{eventWhen(p.eventAt)}</p>
          <p className="mt-2 text-2xl font-extrabold">
            {sold} <span className="text-base font-semibold text-[#c9d1e3]">of {p.seats} seats taken</span>
          </p>
        </section>
        {rows.length > 0 && <MessageForm id={p.id} count={buyers} />}
        {rows.length === 0 ? (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center text-sm text-muted">No tickets yet. Share your event link to fill seats.</p>
        ) : (
          <section className="rounded-[20px] bg-white px-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            {rows.map((r) => (
              <div key={r.code} className="flex items-center gap-3 border-b border-[#eef0f4] py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.qty} {r.qty === 1 ? "ticket" : "tickets"}, code {r.code}
                    {r.ward !== "Guest" ? `, ${r.ward}` : ""}
                  </span>
                </span>
                <a href={telLink(r.phone)} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
                  Call
                </a>
                <a href={waLink(r.phone)} target="_blank" rel="noreferrer" className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
                  WhatsApp
                </a>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
