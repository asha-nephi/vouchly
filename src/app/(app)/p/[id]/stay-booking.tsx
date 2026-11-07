"use client";

import { useActionState, useMemo, useState } from "react";
import { bookStay } from "@/app/(app)/book/actions";
import Calendar from "@/components/calendar";
import { ErrorText, PrimaryButton } from "@/components/ui";
import { naira } from "@/lib/catalog";
import { nightsBetween, shortDay } from "@/lib/dates";

export default function StayBooking(p: { productId: string; priceKobo: number; minNights: number; maxGuests: number | null; taken: string[]; today: string; disabled?: string }) {
  const [state, action, pending] = useActionState(bookStay, undefined);
  const [start, setStart] = useState<string | null>(state?.values?.checkIn || null);
  const [end, setEnd] = useState<string | null>(state?.values?.checkOut || null);
  const [guests, setGuests] = useState(Number(state?.values?.guests) || 1);
  const taken = useMemo(() => new Set(p.taken), [p.taken]);
  const nights = start && end ? nightsBetween(start, end) : 0;
  const tooShort = nights > 0 && nights < p.minNights;
  const max = p.maxGuests ?? 20;

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={p.productId} />
      <input type="hidden" name="checkIn" value={start ?? ""} />
      <input type="hidden" name="checkOut" value={end ?? ""} />
      <input type="hidden" name="guests" value={guests} />
      <p className="text-base font-extrabold">Pick your dates</p>
      <p className="-mt-2 text-[13px] text-muted">
        {!start ? "Tap your check-in day." : !end ? "Now tap your check-out day." : `${shortDay(start)} → ${shortDay(end)}`}
        {p.minNights > 1 ? ` · ${p.minNights} nights or more` : ""}
      </p>
      <Calendar mode="range" today={p.today} taken={taken} start={start} end={end} onPick={(s, e) => (setStart(s), setEnd(e))} />

      <div className="flex items-center justify-between rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
        <span>
          <span className="block text-[15px] font-bold">Guests</span>
          {p.maxGuests && <span className="block text-[13px] text-muted">Up to {p.maxGuests}</span>}
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="One less guest" className="size-10 rounded-full border border-[#d5dae4] text-lg font-bold">
            −
          </button>
          <span className="w-5 text-center text-base font-extrabold" aria-live="polite">
            {guests}
          </span>
          <button type="button" onClick={() => setGuests((g) => Math.min(max, g + 1))} aria-label="One more guest" className="size-10 rounded-full border border-[#d5dae4] text-lg font-bold">
            +
          </button>
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">
          Message to the host <span className="font-medium text-muted">(optional)</span>
        </span>
        <textarea
          name="note"
          rows={2}
          defaultValue={state?.values?.note}
          placeholder="e.g. We'll arrive around 6pm"
          className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 outline-none placeholder:text-[#8a93a5] focus:border-ink"
        />
      </label>

      {nights > 0 && (
        <div className="rounded-[18px] bg-white px-4 py-3 text-sm shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <div className="flex justify-between py-1">
            <span className="text-muted">
              {naira(p.priceKobo)} × {nights} {nights === 1 ? "night" : "nights"}
            </span>
            <span className="font-bold">{naira(p.priceKobo * nights)}</span>
          </div>
          <div className="flex justify-between border-t border-[#eef0f4] pt-2 text-base font-extrabold">
            <span>Total</span>
            <span>{naira(p.priceKobo * nights)}</span>
          </div>
        </div>
      )}
      {tooShort && <p className="text-[13px] font-semibold text-[#b42318]">The shortest stay here is {p.minNights} nights.</p>}
      <ErrorText message={p.disabled ?? state?.error} />
      {!p.disabled && (
        <PrimaryButton pending={pending}>{nights > 0 && !tooShort ? `Book and pay ${naira(p.priceKobo * nights)}` : "Pick your dates"}</PrimaryButton>
      )}
      <p className="text-center text-xs text-muted">Paid safely through Paystack. Free cancellation until the host accepts.</p>
    </form>
  );
}
