"use client";

import { useActionState } from "react";
import { startSignup } from "../actions";
import { BackBar, ErrorText, Field, Note, PrimaryButton } from "@/components/ui";

export default function Join() {
  const [state, action, pending] = useActionState(startSignup, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Create your account" href="/" />
      <form action={action} className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2">
        <span className="w-fit rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">Step 1 of 2</span>
        <h2 className="text-[22px] font-extrabold tracking-tight">Tell us who you are</h2>
        <p className="text-sm leading-relaxed text-muted">
          Every member is invited by someone already on Vouchly. That keeps it safe for everyone.
        </p>
        <Field label="Full name" name="name" defaultValue={state?.values?.name} placeholder="e.g. Nephi Asha" autoComplete="name" />
        <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
        <Field label="Ward or branch" name="ward" defaultValue={state?.values?.ward} placeholder="e.g. Ikeja Ward" />
        <Field label="Invite code" name="invite" defaultValue={state?.values?.invite} placeholder="6-letter code from a member" autoComplete="off" />
        <Note>
          <b>No code?</b> Ask any member already on Vouchly to share theirs. They can find it on their home screen.
        </Note>
        <ErrorText message={state?.error} />
        <div className="mt-auto pt-2">
          <PrimaryButton pending={pending}>Continue</PrimaryButton>
        </div>
      </form>
    </main>
  );
}
