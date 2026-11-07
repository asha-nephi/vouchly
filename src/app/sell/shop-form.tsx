"use client";

import { useActionState } from "react";
import { createShop, updateShop } from "../shop/actions";
import { AREAS, CATEGORIES } from "@/lib/catalog";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { Select, TextArea } from "@/components/form-bits";
import PhotoPicker from "@/components/photo-picker";

type Shop = { name: string; about: string | null; category: string; area: string; coverPhoto: string | null };

export default function ShopForm({ mode, shop }: { mode: "create" | "edit"; shop?: Shop }) {
  const [state, action, pending] = useActionState(mode === "create" ? createShop : updateShop, undefined);
  const v = state?.values;
  return (
    <form action={action} className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
      {mode === "create" && (
        <>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 flex-1 rounded bg-ink" />
            <span className="h-1.5 flex-1 rounded bg-[#d5dae4]" />
            <span className="h-1.5 flex-1 rounded bg-[#d5dae4]" />
          </div>
          <p className="text-[13px] font-bold text-muted">Step 1 of 3 · About your shop</p>
        </>
      )}
      <PhotoPicker name="cover" keepName="keepCover" existing={shop?.coverPhoto ? [shop.coverPhoto] : []} max={1} label="Cover photo (optional)" tall />
      <Field label="Shop name" name="name" placeholder="e.g. Mama Grace Tigernut" defaultValue={v?.name ?? shop?.name} />
      {mode === "create" ? (
        <Select
          label="What do you sell?"
          name="category"
          placeholder="Pick one"
          defaultValue={v?.category}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        />
      ) : null}
      <Select label="Your area" name="area" placeholder="Pick your area" defaultValue={v?.area ?? shop?.area} options={AREAS.map((a) => ({ value: a, label: a }))} />
      <TextArea label="About your shop" name="about" placeholder="e.g. Fresh tigernut drinks, made the night before delivery." defaultValue={v?.about ?? shop?.about ?? ""} />
      {mode === "create" && <Note tone="green">Your shop gets the Verified member badge, because you&apos;re already a confirmed member.</Note>}
      <ErrorText message={state?.error} />
      {state?.saved && <Note tone="green">Saved.</Note>}
      <div className="mt-auto pt-2">
        <PrimaryButton pending={pending}>{mode === "create" ? "Continue" : "Save shop"}</PrimaryButton>
      </div>
    </form>
  );
}
