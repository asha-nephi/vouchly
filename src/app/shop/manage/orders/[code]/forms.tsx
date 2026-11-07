"use client";

import { useActionState } from "react";
import { sellerRefund, sendRider } from "../actions";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";

// Rider's details, sent to the buyer.
export function RiderForm({ code, estimate }: { code: string; estimate?: string }) {
  const [state, action, pending] = useActionState(sendRider, undefined);
  const v = state?.values;
  return (
    <form action={action} className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <input type="hidden" name="code" value={code} />
      <p className="text-[15px] font-extrabold">Send with a rider</p>
      <p className="-mt-2 text-[13px] text-muted">Book the rider on Bolt or with your dispatch, then add their details here.</p>
      <Field label="Rider's name" name="riderName" placeholder="e.g. Tunde" defaultValue={v?.riderName} />
      <Field label="Rider's phone" name="riderPhone" inputMode="tel" placeholder="0803 123 4567" defaultValue={v?.riderPhone} />
      <Field
        label="What the buyer pays the rider"
        name="riderCost"
        inputMode="numeric"
        placeholder={estimate ? `e.g. ${estimate}` : "e.g. 2500"}
        defaultValue={v?.riderCost}
        required={false}
      />
      <Field label="Tracking link" name="tracking" placeholder="https://…" defaultValue={v?.tracking} required={false} hint="From Bolt's “Share trip” button." />
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Rider is on the way</PrimaryButton>
    </form>
  );
}

// Cancel and give the buyer all their money back.
export function RefundForm({ code, problem }: { code: string; problem?: boolean }) {
  const [state, action, pending] = useActionState(sellerRefund, undefined);
  return (
    <details className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]" open={!!state?.error}>
      <summary className="cursor-pointer text-[15px] font-bold text-[#b42318]">{problem ? "Agree and refund the buyer" : "Cancel and refund"}</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="code" value={code} />
        <p className="text-[13px] text-muted">The buyer gets back the full amount they paid. This can&apos;t be undone.</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">Reason</span>
          <textarea
            name="reason"
            rows={2}
            required
            defaultValue={state?.values?.reason}
            placeholder={problem ? "e.g. Sorry, some items were missing" : "e.g. Sorry, I ran out of tigernut this week"}
            className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 text-[15px] outline-none placeholder:text-[#8a93a5] focus:border-ink"
          />
        </label>
        <ErrorText message={state?.error} />
        <button type="submit" disabled={pending} className="h-12 rounded-2xl bg-[#b42318] text-[15px] font-bold text-white disabled:opacity-60">
          {pending ? "Please wait…" : "Refund buyer"}
        </button>
      </form>
    </details>
  );
}
