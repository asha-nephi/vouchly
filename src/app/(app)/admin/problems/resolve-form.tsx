"use client";

import { useActionState, useState } from "react";
import { flushSync } from "react-dom";
import { resolveProblem } from "./actions";
import { ErrorText } from "@/components/ui";

export default function ResolveForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resolveProblem, undefined);
  const [choice, setChoice] = useState("");
  const btn = "h-11 flex-1 rounded-full text-sm font-bold disabled:opacity-60";
  return (
    <form action={action} className="mt-3 flex flex-col gap-2.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="choice" value={choice} />
      <textarea
        name="note"
        rows={2}
        placeholder="Message to both (optional)"
        className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-[#8a93a5] focus:border-ink"
      />
      <ErrorText message={state?.error} />
      <div className="flex gap-2">
        <button onClick={() => flushSync(() => setChoice("refund"))} disabled={pending} className={`${btn} bg-[#b42318] text-white`}>
          Refund buyer
        </button>
        <button onClick={() => flushSync(() => setChoice("seller"))} disabled={pending} className={`${btn} border border-[#d5dae4] bg-white`}>
          Seller keeps it
        </button>
      </div>
    </form>
  );
}
