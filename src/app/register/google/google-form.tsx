"use client";

import { useActionState } from "react";
import { startGoogleBuyerSignup } from "../../actions";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";

export default function GoogleBuyerForm() {
  const [state, action, pending] = useActionState(startGoogleBuyerSignup, undefined);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Send code</PrimaryButton>
    </form>
  );
}
