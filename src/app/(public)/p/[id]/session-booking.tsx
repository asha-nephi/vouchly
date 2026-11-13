"use client";

import { useActionState, useState } from "react";
import { bookSession } from "@/app/(app)/book/actions";
import GuestFields from "@/components/guest-fields";
import { ErrorText, PrimaryButton } from "@/components/ui";
import { naira } from "@/lib/catalog";
import { shortDay } from "@/lib/dates";
import { timeLabel } from "@/lib/listings";
import DiscountField from "@/components/discount-field";

const chip = "flex h-[52px] items-center justify-center rounded-2xl border text-[13px] font-bold";

export default function SessionBooking(p: { productId: string; priceKobo: number; slots: { day: string; times: string[] }[]; guest?: boolean; disabled?: string }) {
  const [state, action, pending] = useActionState(bookSession, undefined);
  const v = state?.values;
  const [day, setDay] = useState(v?.day && p.slots.some((s) => s.day === v.day) ? v.day : (p.slots[0]?.day ?? ""));
  const [time, setTime] = useState(v?.time ?? "");
  const times = p.slots.find((s) => s.day === day)?.times ?? [];

  if (!p.slots.length && !p.disabled) return <p className="rounded-[18px] bg-white p-4 text-sm text-muted">No free times in the next two weeks. Please check back soon.</p>;
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={p.productId} />
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="time" value={time} />
      <p className="text-base font-extrabold">Pick a day</p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {p.slots.map((s) => {
          const [wd, ...rest] = shortDay(s.day).replace(",", "").split(" ");
          const on = s.day === day;
          return (
            <button
              key={s.day}
              type="button"
              aria-pressed={on}
              onClick={() => (setDay(s.day), setTime(""))}
              className={`${chip} w-[68px] shrink-0 flex-col whitespace-nowrap ${on ? "border-ink bg-ink text-white" : "border-[#d5dae4] bg-white"}`}
            >
              <span className="text-[11px] font-semibold opacity-70">{wd}</span>
              {rest.join(" ")}
            </button>
          );
        })}
      </div>
      <p className="text-base font-extrabold">Pick a time</p>
      <div className="grid grid-cols-4 gap-2">
        {times.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === time}
            onClick={() => setTime(t)}
            className={`${chip} ${t === time ? "border-ink bg-ink text-white" : "border-[#d5dae4] bg-white"}`}
          >
            {timeLabel(t)}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">
          What would you like help with? <span className="font-medium text-muted">(optional)</span>
        </span>
        <textarea
          name="note"
          rows={2}
          defaultValue={v?.note}
          placeholder="e.g. I have an interview next week for a bank job"
          className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 outline-none placeholder:text-[#8a93a5] focus:border-ink"
        />
      </label>
      {p.guest && !p.disabled && <GuestFields values={v} />}
      {!p.disabled && <DiscountField value={state?.values?.discount} />}
      <ErrorText message={p.disabled ?? state?.error} />
      {!p.disabled && <PrimaryButton pending={pending}>{time ? `Book ${shortDay(day)}, ${timeLabel(time)} · ${naira(p.priceKobo)}` : "Pick a time"}</PrimaryButton>}
      <p className="text-center text-xs text-muted">Paid safely through Paystack. Free cancellation until it&apos;s accepted.</p>
    </form>
  );
}
