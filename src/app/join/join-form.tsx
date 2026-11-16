"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startBuyerSignup, upgradeBuyerToMember } from "../actions";
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
  help,
}: {
  code?: string;
  inviter?: string;
  fromGuest?: boolean;
  existingBuyer?: boolean;
  googleEnabled?: boolean;
  emailEnabled?: boolean;
  help?: string | null;
}) {
  if (!existingBuyer) return <AccountFirst code={code} inviter={inviter} fromGuest={fromGuest} googleEnabled={googleEnabled} emailEnabled={emailEnabled} help={help} />;
  return <InviteForm code={code} inviter={inviter} />;
}

// Not signed in yet: account, ward and invite code on one screen.
function AccountFirst({ code, inviter, fromGuest, googleEnabled, emailEnabled, help }: { code?: string; inviter?: string; fromGuest?: boolean; googleEnabled?: boolean; emailEnabled?: boolean; help?: string | null }) {
  const [state, action, pending] = useActionState(startBuyerSignup, undefined);
  const v = state?.values;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Create your account" href={code ? `/join?code=${code}` : "/join"} />
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-2">
        <span className="w-fit text-sm font-extrabold text-accent">Step 2 of 4</span>
        <h2 className="text-[22px] font-extrabold tracking-tight">Make your account</h2>
        {inviter ? (
          <Note tone="green">
            <b>{inviter}</b> invited you. Your code is filled in.
          </Note>
        ) : (
          <p className="text-sm leading-relaxed text-muted">Every seller is invited by a member already on Vouchly. Have their invite code ready.</p>
        )}
        {fromGuest && <Note>Your past guest orders stay on their private order links.</Note>}
        {googleEnabled && (
          <>
            <a href="/auth/google" className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-white text-sm font-bold">
              <GoogleMark />
              Continue with Google
            </a>
            <p className="text-center text-xs text-muted">With Google, you add your phone, ward and code on the next screen.</p>
          </>
        )}
        {googleEnabled && emailEnabled && (
          <p className="flex items-center gap-3 text-xs font-bold text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or use your email</p>
        )}
        {emailEnabled && (
          <form action={action} className="flex flex-col gap-3.5">
            <input type="hidden" name="join" value="1" />
            <Field label="Full name" name="name" defaultValue={v?.name} placeholder="e.g. Grace Okafor" autoComplete="name" />
            <Field label="Email address" name="email" defaultValue={v?.email} type="email" placeholder="you@example.com" autoComplete="email" />
            <Field label="Phone number" name="phone" defaultValue={v?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" hint="Buyers use it to reach you about orders." />
            <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 12 characters. A short sentence is easy to remember." />
            <MemberFields ward={v?.ward} invite={v?.invite ?? code} />
            <ErrorText message={state?.error} />
            <PrimaryButton pending={pending}>Create my account</PrimaryButton>
          </form>
        )}
        {!googleEnabled && !emailEnabled && <Note tone="amber">Sign-up is not open right now. Please try again later.</Note>}
        <p className="text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-bold text-accent">Log in</Link>, then come back to this page.
        </p>
        {help && (
          <p className="text-center text-sm text-muted">
            Stuck? <a href={help} target="_blank" rel="noopener noreferrer" className="font-bold text-accent">Chat with us on WhatsApp</a>
          </p>
        )}
      </div>
    </main>
  );
}

// Ward and invite code, shared by the email and Google sign-up forms.
export function MemberFields({ ward, invite }: { ward?: string; invite?: string }) {
  return (
    <>
      <Field label="Ward or branch" name="ward" defaultValue={ward} placeholder="e.g. Ikeja Ward" />
      <Field label="Invite code" name="invite" defaultValue={invite} placeholder="Code from the member who invited you" autoComplete="off" hint="No code? Ask a member on Vouchly. It's on their Me page." />
    </>
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
        <span className="w-fit text-sm font-extrabold text-accent">Step 2 of 4</span>
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
