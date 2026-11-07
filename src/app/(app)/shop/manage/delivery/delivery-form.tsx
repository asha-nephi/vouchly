"use client";

import { useActionState } from "react";
import { saveDelivery } from "../../actions";
import { AREAS, CUTOFF_TIMES, DAY_KEYS, DAYS } from "@/lib/catalog";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { ChipChecks, Select, Switch } from "@/components/form-bits";

type Settings = {
  deliveryDays: number[];
  orderCutoff: string;
  pickupOn: boolean;
  pickupSpot: string | null;
  pickupHours: string | null;
  dropOffOn: boolean;
  dropOffAreas: string[];
  dropOffFeeKobo: number;
  riderOn: boolean;
  riderPayer: "buyer_on_arrival" | "fee_in_order";
  riderEstimate: string | null;
  riderAreaFees: Record<string, number>;
};

const card = "flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

function Head({ title, sub, name, on }: { title: string; sub: string; name: string; on: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="block text-[13px] text-muted">{sub}</span>
      </span>
      <Switch name={name} defaultChecked={on} label={title} />
    </label>
  );
}

export default function DeliveryForm({ s, isNew }: { s: Settings; isNew: boolean }) {
  const [state, action, pending] = useActionState(saveDelivery, undefined);
  const [cutDay, cutTime] = s.orderCutoff.split(" ");
  const riderFee = s.riderAreaFees.default ? String(s.riderAreaFees.default / 100) : "";

  return (
    <form action={action} className="flex flex-col gap-4 px-4 pb-8 pt-2">
      {isNew && (
        <>
          <input type="hidden" name="new" value="1" />
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 flex-1 rounded bg-ink" />
            <span className="h-1.5 flex-1 rounded bg-ink" />
            <span className="h-1.5 flex-1 rounded bg-[#d5dae4]" />
          </div>
          <p className="text-[13px] font-bold text-muted">Step 2 of 3 · Delivery & pickup</p>
        </>
      )}

      <p className="text-[15px] font-extrabold">Which days do you deliver?</p>
      <ChipChecks items={DAYS.map((d, i) => ({ key: String(i), label: d }))} prefix="day" checked={(k) => s.deliveryDays.includes(Number(k))} />

      <div className="grid grid-cols-2 gap-2.5">
        <Select label="Orders close on" name="cutDay" defaultValue={cutDay} options={DAY_KEYS.map((k, i) => ({ value: k, label: DAYS[i] }))} />
        <Select label="At" name="cutTime" defaultValue={cutTime} options={CUTOFF_TIMES.map((t) => ({ value: t, label: t }))} />
      </div>

      <p className="pt-1 text-[15px] font-extrabold">How can buyers get their order?</p>

      <section className={card}>
        <Head title="Pickup" sub="Buyers collect from your spot. Free." name="pickupOn" on={s.pickupOn} />
        <Field label="Pickup spot" name="pickupSpot" placeholder="e.g. Allen Avenue, Ikeja" required={false} defaultValue={s.pickupSpot ?? ""} />
        <Field label="Pickup hours" name="pickupHours" placeholder="e.g. 10am – 2pm" required={false} defaultValue={s.pickupHours ?? ""} />
      </section>

      <section className={card}>
        <Head title="I drop it off myself" sub="Only buyers in these areas see this." name="dropOffOn" on={s.dropOffOn} />
        <ChipChecks items={AREAS.map((a) => ({ key: a, label: a }))} prefix="area:" checked={(k) => s.dropOffAreas.includes(k)} />
        <Field
          label="Drop-off fee (₦)"
          name="dropOffFee"
          inputMode="numeric"
          placeholder="Leave empty for free"
          required={false}
          defaultValue={s.dropOffFeeKobo ? String(s.dropOffFeeKobo / 100) : ""}
        />
      </section>

      <section className={card}>
        <Head title="Rider (Bolt or dispatch)" sub="You book the rider on delivery day." name="riderOn" on={s.riderOn} />
        <p className="text-[13px] font-bold text-muted">Who pays the rider?</p>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-chip p-1">
          {[
            { v: "buyer_on_arrival", l: "Buyer, on arrival" },
            { v: "fee_in_order", l: "Add fee to order" },
          ].map((o) => (
            <label key={o.v} className="cursor-pointer">
              <input type="radio" name="riderPayer" value={o.v} defaultChecked={s.riderPayer === o.v} className="peer sr-only" />
              <span className="flex h-[38px] items-center justify-center rounded-[10px] text-[13px] font-semibold text-muted peer-checked:bg-white peer-checked:font-extrabold peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgba(20,33,61,0.08)] peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {o.l}
              </span>
            </label>
          ))}
        </div>
        <Field label="Estimate buyers see" name="riderEstimate" placeholder="₦2,000 – ₦3,500" required={false} defaultValue={s.riderEstimate ?? ""} hint="Shown when the buyer pays the rider." />
        <Field label="Fee added to orders (₦)" name="riderFee" inputMode="numeric" placeholder="e.g. 2500" required={false} defaultValue={riderFee} hint="Only used if you add the fee to the order." />
      </section>

      <Note tone="amber">If the buyer isn&apos;t home when the rider comes, the buyer pays for the return trip. Buyers see this at checkout.</Note>
      <ErrorText message={state?.error} />
      {state?.saved && <Note tone="green">Delivery settings saved.</Note>}
      <PrimaryButton pending={pending}>{isNew ? "Continue" : "Save"}</PrimaryButton>
    </form>
  );
}
