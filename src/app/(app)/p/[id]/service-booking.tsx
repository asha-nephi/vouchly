"use client";

import { useActionState } from "react";
import { bookService } from "@/app/(app)/book/actions";
import { Select } from "@/components/form-bits";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";
import { naira } from "@/lib/catalog";
import { shortDay } from "@/lib/dates";
import { TIME_SLOTS } from "@/lib/listings";

const chip =
  "flex h-[52px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d5dae4] bg-white px-3 text-[13px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

export default function ServiceBooking(p: {
  productId: string;
  quote: boolean;
  priceKobo: number;
  priceUnit: string | null;
  days: string[];
  areas: string[];
  defaultArea: string;
  disabled?: string;
}) {
  const [state, action, pending] = useActionState(bookService, undefined);
  const v = state?.values;
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={p.productId} />
      <p className="text-base font-extrabold">When should they come?</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="Day">
        {p.days.map((d, i) => {
          const [wd, ...rest] = shortDay(d).replace(",", "").split(" ");
          return (
            <label key={d} className="relative shrink-0">
              <input type="radio" name="day" value={d} defaultChecked={v?.day ? v.day === d : i === 0} className="peer sr-only" />
              <span className={`${chip} w-[68px] whitespace-nowrap`}>
                <span className="text-[11px] font-semibold opacity-70">{wd}</span>
                {rest.join(" ")}
              </span>
            </label>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time">
        {TIME_SLOTS.map((t, i) => (
          <label key={t.key} className="relative">
            <input type="radio" name="slot" value={t.key} defaultChecked={v?.slot ? v.slot === t.key : i === 0} className="peer sr-only" />
            <span className={chip}>
              {t.label}
              <span className="text-[11px] font-semibold opacity-70">{t.hours}</span>
            </span>
          </label>
        ))}
      </div>
      <Select label="Your area" name="area" defaultValue={v?.area ?? (p.areas.includes(p.defaultArea) ? p.defaultArea : p.areas[0])} options={p.areas.map((a) => ({ value: a, label: a }))} />
      <Field label="Address" name="address" placeholder="e.g. 12 Opebi Road" autoComplete="street-address" defaultValue={v?.address} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">What do you need done?</span>
        <textarea
          name="details"
          rows={3}
          required
          defaultValue={v?.details}
          placeholder="e.g. Kitchen sink is leaking under the cabinet"
          className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 outline-none placeholder:text-[#8a93a5] focus:border-ink"
        />
      </label>
      <ErrorText message={p.disabled ?? state?.error} />
      {!p.disabled && <PrimaryButton pending={pending}>{p.quote ? "Ask for a price" : `Book and pay ${naira(p.priceKobo)}`}</PrimaryButton>}
      <p className="text-center text-xs text-muted">
        {p.quote ? "They'll send you a price. You only pay if you accept it." : "Paid safely through Paystack. Free cancellation until they accept."}
      </p>
    </form>
  );
}
