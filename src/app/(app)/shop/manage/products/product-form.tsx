"use client";

import { useActionState, useState } from "react";
import { deleteProduct, saveProduct } from "../../actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { ChipChecks, Radio, Select, Switch } from "@/components/form-bits";
import PhotoPicker from "@/components/photo-picker";
import FileInput from "@/components/file-input";
import SubmitButton from "@/components/submit-button";
import { AREAS, DAYS } from "@/lib/catalog";
import { AMENITIES, CHECK_TIMES, timeLabel } from "@/lib/listings";
import { FILE_ACCEPT, fileLabel } from "@/lib/file-types";

type Kind = "item" | "stay" | "service" | "digital";
type Product = {
  id: string;
  kind: Kind;
  name: string;
  size: string | null;
  priceKobo: number;
  photos: string[];
  sellMode: "preorder" | "in_stock";
  maxPerDay: number | null;
  isActive: boolean;
  about: string | null;
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  minNights: number;
  rules: string | null;
  privateAddress: string | null;
  priceType: "fixed" | "quote";
  priceUnit: string | null;
  serviceAreas: string[];
  workDays: number[];
  fileName: string | null;
  fileSize: number | null;
};

const KINDS = [
  { value: "item", title: "A product", detail: "Food, drinks, clothes, things you make or sell" },
  { value: "stay", title: "A stay", detail: "Shortlet, apartment or room guests book by the night" },
  { value: "service", title: "A service", detail: "Plumbing, carpentry, cleaning, repairs, catering, makeup…" },
  { value: "digital", title: "A digital product", detail: "E-book, guide, templates, audio. Buyers download it right after paying" },
] as const;

const area = "rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 leading-relaxed outline-none placeholder:text-[#8a93a5] focus:border-ink";

function TextBox({ label, name, defaultValue, placeholder, optional = true }: { label: string; name: string; defaultValue?: string; placeholder?: string; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold">
        {label} {optional && <span className="font-medium text-muted">(optional)</span>}
      </span>
      <textarea name={name} rows={3} defaultValue={defaultValue} placeholder={placeholder} required={!optional} className={area} />
    </label>
  );
}

export default function ProductForm({ product, first, defaultKind = "item", maxFileMb = 10 }: { product?: Product; first?: boolean; defaultKind?: Kind; maxFileMb?: number }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const v = state?.values;
  const [kind, setKind] = useState<Kind>((v?.kind as Kind) ?? product?.kind ?? defaultKind);
  const [priceType, setPriceType] = useState(v?.priceType ?? product?.priceType ?? "fixed");
  const mode = v?.sellMode ?? product?.sellMode ?? "preorder";
  const list = (key: string, saved: string[] | undefined) => (v?.[key] !== undefined ? v[key].split("|") : (saved ?? []));
  const amenities = list("amenities", product?.amenities);
  const areas = list("serviceAreas", product?.serviceAreas);
  const days = v?.workDays !== undefined ? v.workDays.split("|").map(Number) : (product?.workDays ?? [1, 2, 3, 4, 5, 6]);
  const num = (key: string, saved: number | null | undefined) => v?.[key] ?? (saved != null ? String(saved) : "");
  const price = v?.price ?? (product && product.priceKobo ? String(product.priceKobo / 100) : "");

  return (
    <>
      <form action={action} className="flex flex-col gap-4 px-4 pb-4 pt-2">
        {first && (
          <>
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-1.5 flex-1 rounded bg-ink" />
              <span className="h-1.5 flex-1 rounded bg-ink" />
              <span className="h-1.5 flex-1 rounded bg-ink" />
            </div>
            <p className="text-[13px] font-bold text-muted">Step 3 of 3 · Your first listing</p>
          </>
        )}
        {product && <input type="hidden" name="id" value={product.id} />}

        {/* The choice lives in state, so a form reset after an error can't wipe it. */}
        <input type="hidden" name="kind" value={kind} />
        <fieldset key={`${kind}-${state?.error ?? ""}`} className="flex flex-col gap-2">
          <legend className="pb-2 text-[15px] font-extrabold">What are you listing?</legend>
          {KINDS.map((k) => (
            <label key={k.value} className="cursor-pointer">
              <input type="radio" name="kindPick" value={k.value} defaultChecked={kind === k.value} onChange={() => setKind(k.value)} className="peer sr-only" />
              <span className="flex flex-col rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)] peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                <span className="text-[15px] font-bold">{k.title}</span>
                <span className="text-[13px] text-muted">{k.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <PhotoPicker
          name="photos"
          keepName="keep"
          existing={product?.photos}
          max={kind === "stay" ? 6 : 3}
          label={kind === "stay" ? "Photos (up to 6: rooms, bathroom, outside)" : kind === "digital" ? "Cover picture (up to 3)" : "Photos (up to 3)"}
        />
        <Field
          label={kind === "stay" ? "Listing name" : kind === "service" ? "Service name" : kind === "digital" ? "Title" : "Product name"}
          name="name"
          placeholder={
            kind === "stay" ? "e.g. 2-bed flat in Ikeja GRA" : kind === "service" ? "e.g. AC servicing" : kind === "digital" ? "e.g. Mission prep journal (PDF)" : "e.g. Tigernut + dates"
          }
          defaultValue={v?.name ?? product?.name}
        />

        {kind === "item" && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Price (₦)" name="price" inputMode="numeric" placeholder="3000" defaultValue={price} />
              <Field label="Size" name="size" placeholder="1 litre" required={false} defaultValue={v?.size ?? product?.size ?? ""} />
            </div>
            <p className="text-[15px] font-extrabold">How do people buy it?</p>
            <Radio name="sellMode" value="preorder" defaultChecked={mode === "preorder"} title="Pre-order for delivery day" detail="Buyers order ahead, you make it for your delivery day" />
            <Radio name="sellMode" value="in_stock" defaultChecked={mode === "in_stock"} title="In stock now" detail="Ready to pick up or deliver" />
            <Field
              label="Most you can make per delivery day"
              name="maxPerDay"
              inputMode="numeric"
              placeholder="e.g. 20"
              required={false}
              hint="We stop orders when you reach this. Leave empty for no limit."
              defaultValue={num("maxPerDay", product?.maxPerDay)}
            />
          </>
        )}

        {kind === "stay" && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Price a night (₦)" name="price" inputMode="numeric" placeholder="45000" defaultValue={price} />
              <Field label="Shortest stay (nights)" name="minNights" inputMode="numeric" placeholder="1" defaultValue={num("minNights", product?.minNights ?? 1)} />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Guests" name="guests" inputMode="numeric" placeholder="4" defaultValue={num("guests", product?.guests)} />
              <Field label="Bedrooms" name="bedrooms" inputMode="numeric" placeholder="2" defaultValue={num("bedrooms", product?.bedrooms)} />
              <Field label="Bathrooms" name="bathrooms" inputMode="numeric" placeholder="2" defaultValue={num("bathrooms", product?.bathrooms)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                label="Check in from"
                name="checkInTime"
                defaultValue={v?.checkInTime ?? product?.checkInTime ?? "14:00"}
                options={CHECK_TIMES.map((t) => ({ value: t, label: timeLabel(t) }))}
              />
              <Select
                label="Check out by"
                name="checkOutTime"
                defaultValue={v?.checkOutTime ?? product?.checkOutTime ?? "12:00"}
                options={CHECK_TIMES.map((t) => ({ value: t, label: timeLabel(t) }))}
              />
            </div>
            <p className="text-[15px] font-extrabold">What&apos;s there?</p>
            <ChipChecks items={AMENITIES.map((a) => ({ key: a, label: a }))} prefix="amenity:" checked={(k) => amenities.includes(k)} />
            <TextBox label="About the place" name="about" defaultValue={v?.about ?? product?.about ?? ""} placeholder="e.g. Quiet, fully furnished flat close to the airport." />
            <TextBox label="House rules" name="rules" defaultValue={v?.rules ?? product?.rules ?? ""} placeholder="e.g. No parties. No smoking indoors." />
            <Field
              label="Full address"
              name="privateAddress"
              placeholder="e.g. Flat 3, 12 Isaac John Street, GRA Ikeja"
              hint="Only guests with an accepted booking see this."
              defaultValue={v?.privateAddress ?? product?.privateAddress ?? ""}
            />
          </>
        )}

        {kind === "digital" && (
          <>
            <Field
              label="Price (₦)"
              name="price"
              inputMode="numeric"
              placeholder="2500"
              hint="Put 0 to give it away free. Free downloads help new buyers find you."
              defaultValue={v?.price ?? (product ? String(product.priceKobo / 100) : "")}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">The file buyers get</span>
              {product?.fileName && (
                <span className="rounded-[14px] bg-soft px-3.5 py-2.5 text-[13px] font-semibold text-deep">
                  Now: {product.fileName} ({fileLabel(product.fileName, product.fileSize)}). Choose a new file below to replace it.
                </span>
              )}
              <FileInput
                name="file"
                accept={FILE_ACCEPT}
                required={!product?.fileName}
                className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3.5 file:py-2 file:text-[13px] file:font-bold file:text-white"
              />
              <span className="text-xs text-muted">PDF, EPUB, ZIP, MP3, DOCX, XLSX or PPTX, up to {maxFileMb} MB. Kept private until someone pays.</span>
            </label>
            <TextBox
              label="What's inside"
              name="about"
              defaultValue={v?.about ?? product?.about ?? ""}
              placeholder="e.g. 40 pages of daily study plans, scripture lists and journaling prompts for future missionaries."
              optional={false}
            />
          </>
        )}

        {kind === "service" && (
          <>
            <p className="text-[15px] font-extrabold">How do you price it?</p>
            <input type="hidden" name="priceType" value={priceType} />
            {[
              { value: "fixed", title: "One fixed price", detail: "e.g. AC servicing ₦15,000. Customers pay when they book." },
              { value: "quote", title: "Price after a chat", detail: "Customers describe the job, you send them a price." },
            ].map((o) => (
              <label key={`${o.value}-${priceType}-${state?.error ?? ""}`} className="cursor-pointer">
                <input type="radio" name="pricePick" value={o.value} defaultChecked={priceType === o.value} onChange={() => setPriceType(o.value)} className="peer sr-only" />
                <span className="flex flex-col rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)] peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <span className="text-[15px] font-bold">{o.title}</span>
                  <span className="text-[13px] text-muted">{o.detail}</span>
                </span>
              </label>
            ))}
            {priceType === "fixed" && (
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Price (₦)" name="price" inputMode="numeric" placeholder="15000" defaultValue={price} />
                <Field label="Price is" name="priceUnit" placeholder="per visit" required={false} defaultValue={v?.priceUnit ?? product?.priceUnit ?? ""} />
              </div>
            )}
            <TextBox label="About the service" name="about" defaultValue={v?.about ?? product?.about ?? ""} placeholder="e.g. 10 years fixing leaks, blocked drains and new installations." />
            <p className="text-[15px] font-extrabold">Which days do you work?</p>
            <ChipChecks items={DAYS.map((d, i) => ({ key: String(i), label: d }))} prefix="workday:" checked={(k) => days.includes(Number(k))} />
            <p className="text-[15px] font-extrabold">Which areas do you cover?</p>
            <p className="-mt-3 text-[13px] text-muted">Leave all off to cover all of Lagos.</p>
            <ChipChecks items={AREAS.map((a) => ({ key: a, label: a }))} prefix="servicearea:" checked={(k) => areas.includes(k)} />
          </>
        )}

        {product && (
          <label className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <span className="flex-1">
              <span className="block text-[15px] font-bold">Show in my shop</span>
              <span className="block text-[13px] text-muted">Turn off to hide it for a while</span>
            </span>
            <input type="hidden" name="isActive" value="off" />
            <Switch name="isActive" defaultChecked={product.isActive} label="Show in my shop" />
          </label>
        )}
        <ErrorText message={state?.error} />
        {first && <Note>You can add more after this one.</Note>}
        <PrimaryButton pending={pending}>Save</PrimaryButton>
      </form>
      {product && (
        <form action={deleteProduct} className="px-4 pb-8">
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton className="h-[50px] w-full rounded-2xl text-[14px] font-bold text-[#b42318]">Remove listing</SubmitButton>
        </form>
      )}
    </>
  );
}
