"use client";

import { useActionState } from "react";
import { buyDigital } from "@/app/(app)/book/actions";
import GuestFields from "@/components/guest-fields";
import ActionBar from "@/components/action-bar";
import { ErrorText, PrimaryButton } from "@/components/ui";
import { naira } from "@/lib/catalog";
import DiscountField from "@/components/discount-field";

export default function DigitalBuy(p: { productId: string; priceKobo: number; fileText: string; guest?: boolean; disabled?: string }) {
  const [state, action, pending] = useActionState(buyDigital, undefined);
  const free = p.priceKobo === 0;
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={p.productId} />
      <div className="flex items-center gap-3 rounded-[18px] bg-soft px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-deep" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
        </span>
        <span className="text-[13px] text-deep">
          <b className="block text-[15px]">Instant download</b>
          {p.fileText}. Yours to keep, from your order page.
        </span>
      </div>
      {p.guest && !p.disabled && <GuestFields values={state?.values} />}
      {!free && !p.disabled && <DiscountField value={state?.values?.discount} />}
      <ErrorText message={p.disabled ?? state?.error} />
      {!p.disabled && <ActionBar><PrimaryButton pending={pending}>{free ? "Get it free" : `Buy now · ${naira(p.priceKobo)}`}</PrimaryButton></ActionBar>}
      {!free && <p className="text-center text-xs text-muted">Paid safely through Paystack.</p>}
    </form>
  );
}
