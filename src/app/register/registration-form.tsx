"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startBuyerSignup } from "../actions";
import { BackBar, ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import GoogleMark from "@/components/google-mark";

export default function BuyerRegistrationForm({ emailEnabled, googleEnabled }: { emailEnabled: boolean; googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(startBuyerSignup, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Create an account" href="/login" />
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-8 pt-3">
        <span className="w-fit rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-deep">For buyers</span>
        <h1 className="text-[26px] font-extrabold tracking-tight">Join Vouchly</h1>
        <p className="text-sm leading-relaxed text-muted">Create an account to browse, buy and track your orders. You can still shop as a guest.</p>
        {emailEnabled ? (
          <form action={action} className="flex flex-col gap-3.5">
            <Field label="Full name" name="name" defaultValue={state?.values?.name} placeholder="e.g. Nephi Asha" autoComplete="name" />
            <Field label="Email address" name="email" defaultValue={state?.values?.email} type="email" placeholder="you@example.com" autoComplete="email" />
            <Field label="Phone number" name="phone" defaultValue={state?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" hint="We will send a code to check your number." />
            <Field label="Password" name="password" type="password" autoComplete="new-password" hint="Use at least 12 characters." />
            <ErrorText message={state?.error} />
            <PrimaryButton pending={pending}>Continue with email</PrimaryButton>
          </form>
        ) : (
          <Note>Email sign-up is not ready yet. You can use Google or shop as a guest.</Note>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-8">
        {googleEnabled ? (
          <a href="/auth/google" className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-white text-sm font-bold">
            <GoogleMark />
            Sign up with Google
          </a>
        ) : (
          <p className="rounded-2xl border border-line bg-white px-4 py-3.5 text-center text-sm font-semibold text-muted">Google sign-up will be ready after it is set up.</p>
        )}
        <p className="text-center text-sm text-muted">
          Are you joining as a member? <Link href="/join" className="font-bold text-accent">Use your invite code</Link>
        </p>
        <p className="text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-bold text-accent">Log in</Link>
        </p>
      </div>
    </main>
  );
}
