"use client";

import { useActionState } from "react";
import { startLogin } from "../actions";
import { BackBar, ErrorText, Field, PrimaryButton } from "@/components/ui";

export default function Login() {
  const [state, action, pending] = useActionState(startLogin, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Log in" href="/" />
      <form action={action} className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2">
        <h2 className="text-[22px] font-extrabold tracking-tight">Welcome back</h2>
        <p className="text-sm leading-relaxed text-muted">Enter your phone number and we&apos;ll send you a code.</p>
        <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
        <ErrorText message={state?.error} />
        <div className="mt-auto pt-2">
          <PrimaryButton pending={pending}>Send code</PrimaryButton>
        </div>
      </form>
    </main>
  );
}
