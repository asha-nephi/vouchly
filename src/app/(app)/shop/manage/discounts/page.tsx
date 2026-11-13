import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { naira } from "@/lib/catalog";
import { myShop } from "@/lib/shops";
import SubmitButton from "@/components/submit-button";
import { BackBar, Note } from "@/components/ui";
import { toggleDiscount } from "./actions";
import DiscountForm from "./discount-form";

export const dynamic = "force-dynamic";

const ends = (d: Date) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);

export default async function Discounts() {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const codes = await db.select().from(discountCodes).where(eq(discountCodes.shopId, shop.id)).orderBy(desc(discountCodes.createdAt));
  const now = Date.now();

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Discount codes" href="/shop/manage" />
      <div className="flex flex-col gap-4 px-4">
        <Note>Give a code to new customers, your ward, or followers on WhatsApp. They type it when they pay. Vouchly&apos;s 5% is worked out on the lower price.</Note>
        <DiscountForm />
        {codes.map((c) => {
          const over = (c.endsAt && c.endsAt.getTime() < now) || (c.maxUses !== null && c.used >= c.maxUses);
          const live = c.isActive && !over;
          return (
            <section key={c.id} className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-extrabold tracking-wide">{c.code}</p>
                <p className="text-[13px] text-muted">
                  {c.percentOff ? `${c.percentOff}% off` : `${naira(c.amountOffKobo ?? 0)} off`}, used {c.used}
                  {c.maxUses ? ` of ${c.maxUses}` : ""} {c.used === 1 && !c.maxUses ? "time" : !c.maxUses ? "times" : ""}
                  {c.endsAt ? `, ends ${ends(c.endsAt)}` : ""}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${live ? "bg-[#ddf3e4] text-[#1b6b3a]" : "bg-chip text-[#3a4458]"}`}>
                  {live ? "On" : over ? "Finished" : "Off"}
                </span>
              </div>
              {!over && (
                <form action={toggleDiscount}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton pendingText="…" className="h-9 rounded-full border border-[#d5dae4] px-3 text-xs font-bold">
                    {c.isActive ? "Turn off" : "Turn on"}
                  </SubmitButton>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
