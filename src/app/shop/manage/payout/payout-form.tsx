"use client";

import { useActionState } from "react";
import { savePayout } from "./actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { Select } from "@/components/form-bits";

export default function PayoutForm({ banks, change }: { banks: { value: string; label: string }[]; change: boolean }) {
  const [state, action, pending] = useActionState(savePayout, undefined);
  if (state?.saved) return <Note tone="green">Saved. New payments for your shop go into this account.</Note>;
  const checked = !!state?.accountName;

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-[15px] font-extrabold">{change ? "Change account" : "Where should we pay you?"}</p>
      <Select label="Bank" name="bank" placeholder="Pick your bank" defaultValue={state?.values?.bank} options={banks} />
      <Field label="Account number" name="account" inputMode="numeric" placeholder="10 digits" defaultValue={state?.values?.account} />
      {checked && (
        <>
          <input type="hidden" name="confirm" value="1" />
          <div className="rounded-[18px] bg-[#ddf3e4] px-4 py-3.5">
            <p className="text-xs font-bold text-[#1b6b3a]">Account name</p>
            <p className="text-[15px] font-extrabold">{state?.accountName}</p>
            <p className="mt-1 text-xs text-[#1b6b3a]">Is this you? If not, change the number above.</p>
          </div>
        </>
      )}
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>{checked ? "Yes, save this account" : "Check account"}</PrimaryButton>
    </form>
  );
}
