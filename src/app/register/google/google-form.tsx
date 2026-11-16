"use client";

import { useActionState } from "react";
import { startGoogleBuyerSignup } from "../../actions";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";
import { MemberFields } from "../../join/join-form";

export default function GoogleBuyerForm({ joining, code }: { joining?: boolean; code?: string }) {
  const [state, action, pending] = useActionState(startGoogleBuyerSignup, undefined);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
      {joining && (
        <>
          <input type="hidden" name="join" value="1" />
          <MemberFields ward={state?.values?.ward} invite={state?.values?.invite ?? code} />
        </>
      )}
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Create my account</PrimaryButton>
    </form>
  );
}
