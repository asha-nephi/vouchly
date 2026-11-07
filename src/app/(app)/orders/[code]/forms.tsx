"use client";

import { useActionState, useState } from "react";
import { cancelOrder, leaveReview, reportProblem } from "../actions";
import { ErrorText, PrimaryButton } from "@/components/ui";
import { Radio } from "@/components/form-bits";
import { PROBLEMS, REVIEW_TAGS } from "@/lib/order-status";

const box = "rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]";
const area =
  "rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none placeholder:text-[#8a93a5] focus:border-ink";

export function CancelForm({ code, until }: { code: string; until: string }) {
  const [state, action, pending] = useActionState(cancelOrder, undefined);
  return (
    <details className={box} open={!!state?.error}>
      <summary className="cursor-pointer text-[15px] font-bold">Cancel this order</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="code" value={code} />
        <p className="text-[13px] text-muted">You can cancel until the seller confirms, or until {until}. You get all your money back.</p>
        <ErrorText message={state?.error} />
        <button type="submit" disabled={pending} className="h-12 rounded-2xl bg-[#b42318] text-[15px] font-bold text-white disabled:opacity-60">
          {pending ? "Please wait…" : "Cancel and get a refund"}
        </button>
      </form>
    </details>
  );
}

export function ProblemForm({ code, until }: { code: string; until: string }) {
  const [state, action, pending] = useActionState(reportProblem, undefined);
  return (
    <details className={box} open={!!state?.error}>
      <summary className="cursor-pointer text-[15px] font-bold">Something wrong? Report a problem</summary>
      <form action={action} className="mt-3 flex flex-col gap-2.5">
        <input type="hidden" name="code" value={code} />
        <p className="text-[13px] text-muted">Try messaging the seller first. You can report until {until}.</p>
        {PROBLEMS.map((p) => (
          <Radio key={p.value} name="kind" value={p.value} title={p.label} detail="" defaultChecked={state?.values?.kind === p.value} />
        ))}
        <label className="flex flex-col gap-1.5 pt-1">
          <span className="text-[13px] font-bold">What happened?</span>
          <textarea name="details" rows={3} required defaultValue={state?.values?.details} placeholder="e.g. 2 bottles were missing" className={area} />
        </label>
        <ErrorText message={state?.error} />
        <PrimaryButton pending={pending}>Send report</PrimaryButton>
      </form>
    </details>
  );
}

export function ReviewForm({ code, shopName }: { code: string; shopName: string }) {
  const [state, action, pending] = useActionState(leaveReview, undefined);
  const [stars, setStars] = useState(0);
  return (
    <form action={action} className={`${box} flex flex-col gap-3.5`}>
      <input type="hidden" name="code" value={code} />
      <p className="text-[15px] font-extrabold">How was {shopName}?</p>
      <fieldset className="flex gap-1.5">
        <legend className="sr-only">Stars</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="stars" value={n} className="peer sr-only" onChange={() => setStars(n)} />
            <span
              className={`flex size-11 items-center justify-center rounded-full text-2xl peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${n <= stars ? "text-[#e9a23b]" : "text-[#c8ceda]"}`}
              aria-hidden="true"
            >
              ★
            </span>
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {REVIEW_TAGS.map((t) => (
          <label key={t} className="cursor-pointer">
            <input type="checkbox" name={`tag:${t}`} className="peer sr-only" />
            <span className="flex h-[38px] items-center rounded-full border border-[#d5dae4] bg-white px-3.5 text-[13px] font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {t}
            </span>
          </label>
        ))}
      </div>
      <textarea name="text" rows={3} defaultValue={state?.values?.text} placeholder="Anything else? (optional)" className={area} />
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Post review</PrimaryButton>
    </form>
  );
}
