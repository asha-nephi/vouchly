"use client";

import { useActionState } from "react";
import { payQuote } from "@/app/book/actions";
import { ErrorText, PrimaryButton } from "@/components/ui";

export default function PayQuote({ code, label }: { code: string; label: string }) {
  const [state, action, pending] = useActionState(payQuote, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>{label}</PrimaryButton>
    </form>
  );
}
