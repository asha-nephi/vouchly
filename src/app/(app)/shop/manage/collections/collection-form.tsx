"use client";

import { useActionState } from "react";
import { saveCollection } from "./actions";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";

type Pick = { id: string; name: string; price: string; off: boolean };

// Name plus ticks for which listings go in. Ticks come back after an error.
export default function CollectionForm({ id, name, picked, listings }: { id?: string; name?: string; picked?: string[]; listings: Pick[] }) {
  const [state, action, pending] = useActionState(saveCollection, undefined);
  const v = state?.values;
  const on = new Set(v?.picked ?? picked ?? []);
  return (
    <form key={JSON.stringify(v ?? null)} action={action} className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      {id && <input type="hidden" name="id" value={id} />}
      <Field label="Name" name="name" placeholder="e.g. Christmas gifts" defaultValue={v?.name ?? name ?? ""} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-bold">What goes in it</legend>
        {listings.length === 0 && <p className="text-[13px] text-muted">Add a listing first, then make a collection.</p>}
        {listings.map((l) => (
          <label key={l.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] border border-line px-3.5 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-soft">
            <input type="checkbox" name="p" value={l.id} defaultChecked={on.has(l.id)} className="size-5 shrink-0 accent-[#2A4BD7]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">{l.name}</span>
              <span className="block text-[13px] text-muted">
                {l.price}
                {l.off ? " · Switched off" : ""}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>{id ? "Save changes" : "Make collection"}</PrimaryButton>
    </form>
  );
}
