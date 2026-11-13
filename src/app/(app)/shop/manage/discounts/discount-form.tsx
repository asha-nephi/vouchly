"use client";

import { useActionState, useState } from "react";
import { createDiscount } from "./actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";

export default function DiscountForm() {
  const [state, action, pending] = useActionState(createDiscount, undefined);
  const v = state?.values;
  const [type, setType] = useState(v?.type ?? "percent");
  return (
    <form key={state?.done ? "done" : "form"} action={action} className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <p className="text-[15px] font-extrabold">New code</p>
      {state?.done && <Note tone="green">Code created. Share it with your customers.</Note>}
      <Field label="Code" name="code" placeholder="e.g. WELCOME10" defaultValue={v?.code} />
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "percent", label: "% off" },
          { key: "amount", label: "₦ off" },
        ].map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={type === o.key}
            onClick={() => setType(o.key)}
            className={`h-11 rounded-full text-sm font-bold ${type === o.key ? "bg-ink text-white" : "border border-[#d5dae4] bg-white"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Field
        label={type === "percent" ? "Percent off" : "Naira off"}
        name="value"
        inputMode="numeric"
        placeholder={type === "percent" ? "10" : "500"}
        defaultValue={v?.value}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Most uses" name="maxUses" inputMode="numeric" placeholder="No limit" required={false} defaultValue={v?.maxUses} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">
            Ends on <span className="font-medium text-muted">(optional)</span>
          </span>
          <input type="date" name="endsOn" defaultValue={v?.endsOn} className="h-[50px] rounded-[14px] border border-[#d5dae4] bg-white px-3.5 outline-none focus:border-ink" />
        </label>
      </div>
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Create code</PrimaryButton>
    </form>
  );
}
