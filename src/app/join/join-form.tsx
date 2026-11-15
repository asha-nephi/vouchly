"use client";

import Link from "next/link";
import { useActionState } from "react";
import { upgradeBuyerToMember } from "../actions";
import GoogleMark from "@/components/google-mark";
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
  googleEnabled,
  emailEnabled,
}: {
  code?: string;
  inviter?: string;
  fromGuest?: boolean;
  existingBuyer?: boolean;
  googleEnabled?: boolean;
  emailEnabled?: boolean;
}) {
  if (!existingBuyer) return <AccountFirst code={code} inviter={inviter} fromGuest={fromGuest} googleEnabled={googleEnabled} emailEnabled={emailEnabled} />;
  return <InviteForm code={code} inviter={inviter} />;
}

// Not signed in yet: make an account first, then come back here for the invite code.
function AccountFirst({ code, inviter, fromGuest, googleEnabled, emailEnabled }: { code?: string; inviter?: string; fromGuest?: boolean; googleEnabled?: boolean; emailEnabled?: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Create your account" href={code ? `/join?code=${code}` : "/join"} />
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2">
        <span className="w-fit text-sm font-extrabold text-accent">Step 2 of 3</span>
        <h2 className="text-[22px] font-extrabold tracking-tight">First, make your account</h2>
        <p className="text-sm leading-relaxed text-muted">
          Every member is invited by someone already on Vouchly. Make your account first, then you&apos;ll enter your ward and invite code.
        </p>
        {inviter && (
          <Note tone="green">
            <b>{inviter}</b> invited you. We&apos;ll keep your code for the next step.
          </Note>
        )}
        {fromGuest && <Note>Your past guest orders stay on their private order links.</Note>}
        {googleEnabled && (
          <a href="/auth/google" className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-white text-sm font-bold">
            <GoogleMark />
            Continue with Google
          </a>
        )}
        {emailEnabled && (
          <Link href="/register" className="flex h-[52px] items-center justify-center rounded-2xl border border-line bg-white text-sm font-bold">
            Sign up with email
          </Link>
        )}
        {!googleEnabled && !emailEnabled && <Note tone="amber">Sign-up is not open right now. Please try again later.</Note>}
        <p className="text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-bold text-accent">Log in</Link>, then come back to this page.
        </p>
      </div>
    </main>
  );
}

function InviteForm({ code, inviter }: { code?: string; inviter?: string }) {
  const [state, action, pending] = useActionState(upgradeBuyerToMember, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Join as a member" href={code ? `/join?code=${code}` : "/join"} />
      <form
        action={action}
        className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2"
      >
        <span className="w-fit text-sm font-extrabold text-accent">Step 3 of 3</span>
        <h2 className="text-[22px] font-extrabold tracking-tight">Join as a member</h2>
        <p className="text-sm leading-relaxed text-muted">
          Your account is ready. Add your ward and the invite code from a confirmed member. Your ward contact will then confirm you.
        </p>
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
          <PrimaryButton pending={pending}>Request member confirmation</PrimaryButton>
        </div>
      </form>
    </main>
  );
}
