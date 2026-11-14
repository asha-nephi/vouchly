"use client";

import { useActionState, useState } from "react";
import { buyTickets } from "@/app/(app)/book/actions";
import GuestFields from "@/components/guest-fields";
import ActionBar from "@/components/action-bar";
import { ErrorText, PrimaryButton } from "@/components/ui";
import { naira } from "@/lib/catalog";
import DiscountField from "@/components/discount-field";

export default function EventTickets(p: { productId: string; priceKobo: number; left: number; guest?: boolean; disabled?: string }) {
  const [state, action, pending] = useActionState(buyTickets, undefined);
  const [qty, setQty] = useState(Number(state?.values?.qty) || 1);
  const free = p.priceKobo === 0;
  const most = Math.min(10, p.left);
  if (p.left <= 0) return <p className="rounded-[18px] bg-[#fbebeb] p-4 text-center text-[15px] font-bold text-[#5c1a12]">Sold out</p>;
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={p.productId} />
      <input type="hidden" name="qty" value={qty} />
      <div className="flex items-center justify-between rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
        <span>
          <span className="block text-[15px] font-bold">Tickets</span>
          <span className="block text-[13px] text-muted">{p.left <= 10 ? `Only ${p.left} left` : `${p.left} seats left`}</span>
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One less ticket" className="size-10 rounded-full border border-[#d5dae4] text-lg font-bold">
            −
          </button>
          <span className="w-5 text-center text-base font-extrabold" aria-live="polite">
            {qty}
          </span>
          <button type="button" onClick={() => setQty((q) => Math.min(most, q + 1))} aria-label="One more ticket" className="size-10 rounded-full border border-[#d5dae4] text-lg font-bold">
            +
          </button>
        </span>
      </div>
      {p.guest && !p.disabled && <GuestFields values={state?.values} />}
      {!free && !p.disabled && <DiscountField value={state?.values?.discount} />}
      <ErrorText message={p.disabled ?? state?.error} />
      {!p.disabled && (
        <ActionBar><PrimaryButton pending={pending}>
          {free ? (qty === 1 ? "Reserve my seat" : `Reserve ${qty} seats`) : `Get ${qty === 1 ? "ticket" : `${qty} tickets`} · ${naira(p.priceKobo * qty)}`}
        </PrimaryButton></ActionBar>
      )}
      {!free && <p className="text-center text-xs text-muted">Paid safely through Paystack.</p>}
    </form>
  );
}
