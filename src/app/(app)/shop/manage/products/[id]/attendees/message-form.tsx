"use client";

import { useActionState } from "react";
import { messageAttendees } from "@/app/(app)/shop/actions";
import { ErrorText, Note, PrimaryButton } from "@/components/ui";

export default function MessageForm({ id, count }: { id: string; count: number }) {
  const [state, action, pending] = useActionState(messageAttendees, undefined);
  if (state?.values?.sent) return <Note tone="green">Sent to {state.values.sent} {state.values.sent === "1" ? "person" : "people"}. They&apos;ll see it under their bell.</Note>;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <input type="hidden" name="id" value={id} />
      <p className="text-[15px] font-extrabold">Message everyone</p>
      <textarea
        name="message"
        rows={3}
        required
        defaultValue={state?.values?.message}
        placeholder="e.g. Here's the Zoom link: https://… See you at 10am!"
        className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 outline-none placeholder:text-[#8a93a5] focus:border-ink"
      />
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Send to {count} {count === 1 ? "person" : "people"}</PrimaryButton>
    </form>
  );
}
