"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startSignup, upgradeBuyerToMember } from "../actions";
import {
  BackBar,
  ErrorText,
  Field,
  Note,
  PrimaryButton,
} from "@/components/ui";

export default function JoinForm({
  code,
  inviter,
  fromGuest,
  existingBuyer,
}: {
  code?: string;
  inviter?: string;
  fromGuest?: boolean;
  existingBuyer?: boolean;
}) {
  const [state, action, pending] = useActionState(existingBuyer ? upgradeBuyerToMember : startSignup, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title={existingBuyer ? "Join as a member" : "Create your account"} href={existingBuyer ? "/me" : "/"} />
      <form
        action={action}
        className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2"
      >
        {!existingBuyer && <span className="w-fit rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">Step 1 of 2</span>}
        {existingBuyer ? (
          <Note>
            You already have a buyer account. An invite from a confirmed member lets you join as a member and request ward confirmation.
          </Note>
        ) : fromGuest && (
          <Note>
            You can <Link href="/register" className="font-bold text-accent">create a buyer account</Link>, or join as a member with an invite code.
          </Note>
        )}
        <h2 className="text-[22px] font-extrabold tracking-tight">
          {existingBuyer ? "Join as a member" : "Tell us who you are"}
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          {existingBuyer ? "Use an invite code from a confirmed member. Your phone is already checked." : "Every member is invited by someone already on Vouchly. That keeps it safe for everyone."}
        </p>
        {!existingBuyer && (
          <>
            <Field label="Full name" name="name" defaultValue={state?.values?.name} placeholder="e.g. Nephi Asha" autoComplete="name" />
            <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
          </>
        )}
        <Field
          label="Ward or branch"
          name="ward"
          defaultValue={state?.values?.ward}
          placeholder="e.g. Ikeja Ward"
        />
        <Field
          label="Invite code"
          name="invite"
          defaultValue={state?.values?.invite ?? code}
          placeholder="6-letter code from a member"
          autoComplete="off"
        />
        {inviter ? (
          <Note tone="green">
            <b>{inviter}</b> invited you, so your code is filled in.
          </Note>
        ) : (
          <Note>
            <b>No code?</b> Ask a confirmed member on Vouchly to share theirs.
            They can find it on their Me page.
          </Note>
        )}
        <ErrorText message={state?.error} />
        <div className="mt-auto pt-2">
          <PrimaryButton pending={pending}>{existingBuyer ? "Request member confirmation" : "Continue"}</PrimaryButton>
        </div>
      </form>
    </main>
  );
}
