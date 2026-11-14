"use client";

import { useActionState } from "react";
import { createShop, updateShop } from "../shop/actions";
import { AREAS, CATEGORIES } from "@/lib/catalog";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { Select, TextArea } from "@/components/form-bits";
import PhotoPicker from "@/components/photo-picker";
import { SELLER_TYPES, SELLER_TYPE_IDS, type SellerType } from "@/lib/seller-types";

type Shop = { name: string; about: string | null; category: string; area: string; coverPhoto: string | null; sellerType: SellerType; trades: string[] };

// What kind of seller, and the chips for what they do. Decides the dashboard and where buyers find them.
function SellerPath({ type, trades }: { type: SellerType; trades: string[] }) {
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-bold">What kind of seller are you?</legend>
        {SELLER_TYPE_IDS.map((t) => (
          <label key={t} className="cursor-pointer">
            <input type="radio" name="sellerType" value={t} data-pick={t} defaultChecked={t === type} className="peer sr-only" />
            <span className="flex flex-col rounded-2xl border border-line bg-white px-4 py-3 peer-checked:border-2 peer-checked:border-accent peer-checked:px-[15px] peer-checked:py-[11px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              <span className="text-[15px] font-bold">{SELLER_TYPES[t].title}</span>
              <span className="text-[13px] leading-snug text-muted">{SELLER_TYPES[t].body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {SELLER_TYPE_IDS.map((t) => (
        <fieldset key={t} data-show={t}>
          <legend className="mb-1 text-[13px] font-bold">{SELLER_TYPES[t].ask}</legend>
          <p className="mb-2.5 text-[13px] text-muted">This decides where buyers find you. Pick all that fit.</p>
          <div className="flex flex-wrap gap-2">
            {SELLER_TYPES[t].trades.map((label) => (
              <label key={label} className="cursor-pointer">
                <input type="checkbox" name="trade" value={label} defaultChecked={t === type && trades.includes(label)} className="peer sr-only" />
                <span className="flex h-11 items-center rounded-full border border-[#D5DAE3] bg-white px-4 text-sm font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}

export default function ShopForm({ mode, shop, path }: { mode: "create" | "edit"; shop?: Shop; path?: { type: SellerType; trades: string[] } | null }) {
  const [state, action, pending] = useActionState(mode === "create" ? createShop : updateShop, undefined);
  const v = state?.values;
  const type = (v?.sellerType as SellerType | undefined) ?? shop?.sellerType ?? path?.type ?? "products";
  const trades = v?.trades !== undefined ? v.trades.split("|").filter(Boolean) : shop?.trades ?? path?.trades ?? [];
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
      <SellerPath key={`${type}:${trades.join("|")}`} type={type} trades={trades} />
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
