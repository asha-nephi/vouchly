"use client";

import { useActionState } from "react";
import { requestPasswordReset, setNewPassword } from "../actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(token ? setNewPassword : requestPasswordReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      {token ? (
        <>
          <input type="hidden" name="token" value={token} />
          <Field label="New password" name="password" type="password" autoComplete="new-password" />
          <ErrorText message={state?.error} />
          <PrimaryButton pending={pending}>Save password</PrimaryButton>
        </>
      ) : (
        <>
          <Field label="Email address" name="email" type="email" defaultValue={state?.values?.email} autoComplete="email" placeholder="you@example.com" />
          {state?.message && <Note tone="green">{state.message}</Note>}
          <ErrorText message={state?.error} />
          <PrimaryButton pending={pending}>Send reset link</PrimaryButton>
        </>
      )}
    </form>
  );
}
