"use client";

import { useActionState } from "react";
import { updateLoginSettings } from "@/app/actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";

export default function LoginSecurityForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [state, action, pending] = useActionState(updateLoginSettings, undefined);
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <Field label="Email address" name="email" type="email" defaultValue={state?.values?.email ?? email} autoComplete="email" placeholder="you@example.com" />
      <Field label={hasPassword ? "New password" : "Password"} name="password" type="password" autoComplete="new-password" hint="Use at least 12 characters." />
      {state?.message && <Note tone="green">{state.message}</Note>}
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>{hasPassword ? "Save changes" : "Add email sign-in"}</PrimaryButton>
    </form>
  );
}
