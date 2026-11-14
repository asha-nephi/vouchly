"use client";

import { useTransition } from "react";
import { advanceOrder } from "./orders/actions";
import { showToast } from "@/components/toast";

// One-tap next step for an order in "Needs you now".
export default function TodoButton({ code, to, label }: { code: string; to: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const form = new FormData();
          form.set("code", code);
          form.set("to", to);
          await advanceOrder(form);
          showToast("Done. The buyer has been told.");
        })
      }
      className="flex h-11 shrink-0 items-center rounded-xl bg-accent px-3.5 text-[13px] font-extrabold text-white disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}
