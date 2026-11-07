import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listBanks, paystackReady } from "@/lib/paystack";
import { myShop } from "@/lib/shops";
import { BackBar, Note } from "@/components/ui";
import PayoutForm from "./payout-form";

export const dynamic = "force-dynamic";

export default async function Payout() {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const banks = paystackReady() ? await listBanks().catch(() => []) : [];

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Payout account" href="/shop/manage" />
      <div className="flex flex-col gap-4 px-4">
        {shop.paystackSubaccount && (
          <section className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <p className="text-[13px] font-bold text-muted">Paid into</p>
            <p className="mt-1 text-[15px] font-extrabold">{shop.payoutAccountName}</p>
            <p className="text-[13px] text-muted">
              {shop.payoutBank} · ···· {shop.payoutAccountLast4}
            </p>
          </section>
        )}
        <Note>
          Buyers pay through Paystack. You get your money in this account, minus Vouchly&apos;s 5% on items. Delivery fees are all yours.
        </Note>
        {banks.length === 0 ? (
          <Note tone="amber">We can&apos;t reach Paystack right now. Please try again in a moment.</Note>
        ) : (
          <PayoutForm banks={banks.map((b) => ({ value: b.code, label: b.name }))} change={!!shop.paystackSubaccount} />
        )}
      </div>
    </main>
  );
}
