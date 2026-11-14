"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { startEmailLogin, startLogin } from "../actions";
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
  const [method, setMethod] = useState<"phone" | "email">(emailVerified ? "email" : "phone");
  const [phoneState, phoneAction, phonePending] = useActionState(startLogin, undefined);
  const [emailState, emailAction, emailPending] = useActionState(startEmailLogin, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Log in" href="/" />
      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">Choose how you want to log in.</p>
        </div>
        {emailExpired && <Note tone="amber">That email link has expired. Log in by phone, then send a new one from Login and security.</Note>}
        {emailTaken && <Note tone="amber">Another account has already verified that email. Log in by phone and use a different email.</Note>}
        {emailVerified && <Note tone="green">Your email is verified. Log in with your email and password.</Note>}
        {googleError && <Note tone="amber">{googleError}</Note>}

        <div className="grid grid-cols-2 rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(20,33,61,0.08)]" aria-label="Login method">
          {(["phone", "email"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={method === value}
              onClick={() => setMethod(value)}
              className={`h-11 rounded-full text-sm font-bold ${method === value ? "bg-ink text-white" : "text-muted"}`}
            >
              {value === "phone" ? "Phone code" : "Email"}
            </button>
          ))}
        </div>

        {method === "phone" ? (
          <form action={phoneAction} className="flex flex-col gap-3.5">
            <p className="text-sm leading-relaxed text-muted">We&apos;ll send a one-time code by SMS.</p>
            <Field label="Phone number" name="phone" defaultValue={phoneState?.values?.phone} type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
            <ErrorText message={phoneState?.error} />
            <PrimaryButton pending={phonePending}>Send code</PrimaryButton>
          </form>
        ) : (
          <form action={emailAction} className="flex flex-col gap-3.5">
            <Field label="Email address" name="email" defaultValue={emailState?.values?.email} type="email" placeholder="you@example.com" autoComplete="email" />
            <Field label="Password" name="password" type="password" autoComplete="current-password" />
            {!emailEnabled && <Note>Verified email accounts can still log in. New email sign-ups and password resets need email to be set up.</Note>}
            <ErrorText message={emailState?.error} />
            <PrimaryButton pending={emailPending}>Log in</PrimaryButton>
            {emailEnabled && <Link href="/reset-password" className="self-center text-sm font-bold text-accent">Forgot password?</Link>}
          </form>
        )}

        <div className="flex items-center gap-3 text-xs font-bold text-muted">
          <span className="h-px flex-1 bg-line" />
          OR
          <span className="h-px flex-1 bg-line" />
        </div>
        {googleEnabled ? (
          <a href="/auth/google" className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-white text-sm font-bold">
            <GoogleMark />
            Continue with Google
          </a>
        ) : (
          <p className="rounded-2xl border border-line bg-white px-4 py-3.5 text-center text-sm font-semibold text-muted">Google sign-in will be ready after it is set up.</p>
        )}

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
