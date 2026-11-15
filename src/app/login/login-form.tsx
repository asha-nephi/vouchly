"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startEmailLogin } from "../actions";
import { BackBar, ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import GoogleMark from "@/components/google-mark";

export default function LoginForm({
  googleEnabled,
  emailEnabled,
  googleError,
  emailExpired,
  emailVerified,
  emailTaken,
}: {
  googleEnabled: boolean;
  emailEnabled: boolean;
  googleError?: string;
  emailExpired: boolean;
  emailVerified?: boolean;
  emailTaken?: boolean;
}) {
  const [emailState, emailAction, emailPending] = useActionState(startEmailLogin, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Log in" href="/" />
      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">Log in with Google, or with your email and password.</p>
        </div>
        {emailExpired && <Note tone="amber">That email link has expired. Log in with Google, then send a new one from Login and security.</Note>}
        {emailTaken && <Note tone="amber">Another account has already verified that email. Log in with Google and use a different email.</Note>}
        {emailVerified && <Note tone="green">Your email is verified. Log in with your email and password.</Note>}
        {googleError && <Note tone="amber">{googleError}</Note>}

        {googleEnabled ? (
          <a href="/auth/google" className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-white text-sm font-bold">
            <GoogleMark />
            Continue with Google
          </a>
        ) : (
          <p className="rounded-2xl border border-line bg-white px-4 py-3.5 text-center text-sm font-semibold text-muted">Google sign-in will be ready after it is set up.</p>
        )}

        <div className="flex items-center gap-3 text-xs font-bold text-muted">
          <span className="h-px flex-1 bg-line" />
          OR WITH EMAIL
          <span className="h-px flex-1 bg-line" />
        </div>
        <form action={emailAction} className="flex flex-col gap-3.5">
          <Field label="Email address" name="email" defaultValue={emailState?.values?.email} type="email" placeholder="you@example.com" autoComplete="email" />
          <Field label="Password" name="password" type="password" autoComplete="current-password" />
          {!emailEnabled && <Note>Email log-in works once your email is verified. New email sign-ups and password resets are not open yet.</Note>}
          <ErrorText message={emailState?.error} />
          <PrimaryButton pending={emailPending}>Log in</PrimaryButton>
          {emailEnabled && <Link href="/reset-password" className="self-center text-sm font-bold text-accent">Forgot password?</Link>}
        </form>

        <p className="text-center text-sm text-muted">
          New to Vouchly? <Link href="/register" className="font-bold text-accent">Create a buyer account</Link>
        </p>
        <p className="text-center text-sm text-muted">
          Have a member invite? <Link href="/join" className="font-bold text-accent">Join as a member</Link>
        </p>
      </div>
    </main>
  );
}
