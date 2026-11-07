"use client";

import { useActionState } from "react";
import { verifyCode } from "../actions";
import { ErrorText, PrimaryButton } from "@/components/ui";

export default function CodeForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(verifyCode, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">6-digit code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          placeholder="••••••"
          className="h-16 rounded-2xl border-2 border-ink bg-white text-center text-[28px] font-extrabold tracking-[0.5em] outline-none placeholder:text-[#c8ceda]"
        />
      </label>
      <ErrorText message={state?.error ?? initialError} />
      <PrimaryButton pending={pending}>Verify</PrimaryButton>
    </form>
  );
}
