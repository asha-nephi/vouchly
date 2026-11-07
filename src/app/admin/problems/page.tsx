import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { orders, shops, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { deliveryDayLabel, shortDateTime, telLink, waLink } from "@/lib/orders";
import { BackBar, Note } from "@/components/ui";
import ResolveForm from "./resolve-form";

export const dynamic = "force-dynamic";

export default async function Problems() {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/home");
  const seller = alias(users, "seller");
  const rows = await db
    .select({ order: orders, shop: shops.name, buyer: users, seller })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .innerJoin(seller, eq(seller.id, shops.ownerId))
    .where(eq(orders.status, "disputed"))
    .orderBy(asc(orders.problemAt));

  const person = (label: string, name: string, phone: string, code: string) => (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span>
        <span className="text-muted">{label}:</span> <b>{name}</b>
      </span>
      <span className="flex gap-1.5">
        <a href={telLink(phone)} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
          Call
        </a>
        <a href={waLink(phone, `Hi ${name.split(" ")[0]}, it's Vouchly about order ${code}.`)} target="_blank" rel="noreferrer" className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold">
          WhatsApp
        </a>
      </span>
    </div>
  );

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Problems" href="/me" />
      <div className="flex flex-col gap-3 px-4">
        <Note>Talk to both sides first. Refunding sends the buyer all their money back through Paystack.</Note>
        {rows.length === 0 && (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center text-sm text-muted">No problems right now.</p>
        )}
        {rows.map(({ order: o, shop, buyer, seller: s }) => (
          <section key={o.id} className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <p className="text-[15px] font-extrabold">
              {o.code} · {shop}
            </p>
            <p className="text-[13px] text-muted">
              {naira(o.itemsKobo + o.deliveryFeeKobo)} · {deliveryDayLabel(o.deliveryDay)}
              {o.problemAt ? ` · reported ${shortDateTime(o.problemAt)}` : ""}
            </p>
            <p className="mt-2 rounded-[14px] bg-[#fbebeb] px-3 py-2.5 text-[13px] text-[#5c1a12]">{o.problem}</p>
            <div className="mt-2">
              {person("Buyer", buyer.name, buyer.phone, o.code)}
              {person("Seller", s.name, s.phone, o.code)}
            </div>
            <ResolveForm id={o.id} />
          </section>
        ))}
      </div>
    </main>
  );
}
