"use client";

import { useActionState } from "react";
import { deleteProduct, saveProduct } from "../../actions";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { Radio, Switch } from "@/components/form-bits";
import PhotoPicker from "@/components/photo-picker";
import SubmitButton from "@/components/submit-button";

type Product = {
  id: string;
  name: string;
  size: string | null;
  priceKobo: number;
  photos: string[];
  sellMode: "preorder" | "in_stock";
  maxPerDay: number | null;
  isActive: boolean;
};

export default function ProductForm({ product, first }: { product?: Product; first?: boolean }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const v = state?.values;
  const mode = v?.sellMode ?? product?.sellMode ?? "preorder";
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
            <p className="text-[13px] font-bold text-muted">Step 3 of 3 · Your first product</p>
          </>
        )}
        {product && <input type="hidden" name="id" value={product.id} />}
        <PhotoPicker name="photos" keepName="keep" existing={product?.photos} max={3} label="Photos (up to 3)" />
        <Field label="Product name" name="name" placeholder="e.g. Tigernut + dates" defaultValue={v?.name ?? product?.name} />
        <div className="grid grid-cols-2 gap-2.5">
          <Field
            label="Price (₦)"
            name="price"
            inputMode="numeric"
            placeholder="3000"
            defaultValue={v?.price ?? (product ? String(product.priceKobo / 100) : undefined)}
          />
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
          defaultValue={v?.maxPerDay ?? (product?.maxPerDay ? String(product.maxPerDay) : "")}
        />
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
        {first && <Note>You can add more products after this one.</Note>}
        <PrimaryButton pending={pending}>Save product</PrimaryButton>
      </form>
      {product && (
        <form action={deleteProduct} className="px-4 pb-8">
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton className="h-[50px] w-full rounded-2xl text-[14px] font-bold text-[#b42318]">
            Remove product
          </SubmitButton>
        </form>
      )}
    </>
  );
}
