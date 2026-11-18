"use client";

import { useActionState, useState } from "react";
import { ErrorText, Note } from "@/components/ui";
import { changeRole, liftSuspension, suspendMember } from "./table-actions";

const btn = "h-10 rounded-full px-4 text-[13px] font-bold disabled:opacity-60";

// Suspend: asks why first, then a second tap to be sure.
export function SuspendForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(suspendMember, undefined);
  const [open, setOpen] = useState(false);
  if (state?.done) return <Note tone="green">{state.done}</Note>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btn} border border-[#f0c4bf] bg-white text-[#b42318]`}>
        Suspend {name.split(" ")[0]}
      </button>
    );
  return (
    <form action={action} className="flex flex-col gap-2.5 rounded-[14px] border border-[#f0c4bf] bg-[#fdf6f5] p-3.5">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-bold text-[#b42318]">Suspend {name}?</p>
      <p className="text-[13px] text-[#5c1a12]">They&apos;ll be signed out everywhere and can&apos;t sign in. Their shop closes and their invite code stops working. You can lift this later.</p>
      <label className="flex flex-col gap-1 text-[13px] font-bold">
        Why? <span className="font-medium text-muted">(only admins see this)</span>
        <textarea name="reason" rows={2} maxLength={300} required className="rounded-[12px] border border-[#d5dae4] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-ink" />
      </label>
      <ErrorText message={state?.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${btn} bg-[#b42318] text-white`}>
          {pending ? "Suspending…" : "Suspend"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${btn} border border-line bg-white`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function LiftForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(liftSuspension, undefined);
  if (state?.done) return <Note tone="green">{state.done}</Note>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <ErrorText message={state?.error} />
      <button type="submit" disabled={pending} className={`${btn} w-fit bg-ink text-white`}>
        {pending ? "Lifting…" : "Lift suspension"}
      </button>
    </form>
  );
}

// Member ↔ ward contact. Admins are never made from here.
export function RoleForm({ id, role }: { id: string; role: "member" | "ward_contact" }) {
  const [state, action, pending] = useActionState(changeRole, undefined);
  const next = role === "member" ? "ward_contact" : "member";
  if (state?.done) return <Note tone="green">{state.done}</Note>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="role" value={next} />
      <ErrorText message={state?.error} />
      <button type="submit" disabled={pending} className={`${btn} w-fit border border-line bg-white`}>
        {pending ? "Saving…" : next === "ward_contact" ? "Make ward contact" : "Make member (not ward contact)"}
      </button>
    </form>
  );
}
