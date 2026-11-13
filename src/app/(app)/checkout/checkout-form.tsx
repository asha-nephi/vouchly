"use client";

import { useActionState, useState } from "react";
import GuestFields from "@/components/guest-fields";
import { placeOrder } from "./actions";
import { AREAS } from "@/lib/catalog";
import { ErrorText, Field, Note, PrimaryButton } from "@/components/ui";
import { Select } from "@/components/form-bits";
import Photo from "@/components/photo";

type Line = { id: string; name: string; size: string | null; photo: string | null; priceKobo: number; qty: number };
type Options = {
  pickup: { spot: string; hours: string | null } | null;
  dropOff: { areas: string[]; feeKobo: number } | null;
  rider: { payOnArrival: boolean; feeKobo: number; estimate: string | null } | null;
};

const naira = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function CheckoutForm(props: {
  shopName: string;
  dayLabel: string | null;
  lines: Line[];
  options: Options;
  defaultArea: string;
  hold: boolean;
  guest?: boolean;
}) {
  const { shopName, dayLabel, lines, options, hold } = props;
  const [state, action, pending] = useActionState(placeOrder, undefined);
  const first = options.pickup ? "pickup" : options.dropOff ? "drop_off" : "rider";
  const [method, setMethod] = useState(state?.values?.method ?? first);
  const [area, setArea] = useState(state?.values?.area ?? props.defaultArea);

  const items = lines.reduce((s, l) => s + l.priceKobo * l.qty, 0);
  const dropOk = !!options.dropOff?.areas.includes(area);
  const fee = method === "drop_off" ? options.dropOff?.feeKobo ?? 0 : method === "rider" && options.rider && !options.rider.payOnArrival ? options.rider.feeKobo : 0;
  const feeLabel = { pickup: "Pickup", drop_off: "Seller drop-off", rider: "Rider" }[method as "pickup"] ?? "Delivery";
  const feeText = method === "rider" && options.rider?.payOnArrival ? "Paid to rider" : fee ? naira(fee) : "Free";

  const choice = (value: string, title: string, detail: string, right: string, disabled = false) => (
    <label className={disabled ? "opacity-50" : "cursor-pointer"}>
      <input
        type="radio"
        name="method"
        value={value}
        checked={method === value}
        disabled={disabled}
        onChange={() => setMethod(value)}
        className="peer sr-only"
      />
      <span className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)] peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        <span className="flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{detail}</span>
        </span>
        <span className="shrink-0 text-sm font-extrabold">{right}</span>
        <span
          className={`size-[22px] shrink-0 rounded-full border-2 ${method === value ? "border-[7px] border-ink" : "border-[#a3abba]"}`}
          aria-hidden="true"
        />
      </span>
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-4 px-4 pb-8 pt-1">
      {props.guest && <GuestFields values={state?.values} />}
      <div className="flex items-center gap-3 rounded-[18px] bg-ink px-4 py-3.5 text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#afc0ff" strokeWidth="2" aria-hidden="true">
          <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" />
        </svg>
        <div>
          <p className="text-xs font-bold text-[#afc0ff]">Delivery day</p>
          <p className="text-base font-extrabold">{dayLabel ?? "Not set yet"}</p>
        </div>
      </div>

      <p className="text-base font-extrabold">How do you want it?</p>
      {(options.dropOff || options.rider) && (
        <Select
          label="Your area"
          name="area"
          defaultValue={area}
          onChange={(a) => {
            setArea(a);
            if (method === "drop_off" && !options.dropOff?.areas.includes(a)) setMethod(options.pickup ? "pickup" : "rider");
          }}
          options={AREAS.map((a) => ({ value: a, label: a }))}
        />
      )}
      {options.pickup && choice("pickup", "Pick up", [options.pickup.spot, options.pickup.hours].filter(Boolean).join(" · "), "Free")}
      {options.dropOff &&
        choice(
          "drop_off",
          "Seller drops it off",
          dropOk ? `${shopName} brings it to you in ${area}` : `Only in ${options.dropOff.areas.join(", ")}`,
          options.dropOff.feeKobo ? naira(options.dropOff.feeKobo) : "Free",
          !dropOk,
        )}
      {options.rider &&
        choice(
          "rider",
          "Rider (Bolt or dispatch)",
          options.rider.payOnArrival ? `About ${options.rider.estimate}. You pay the rider when it arrives.` : "The seller books a rider for you.",
          options.rider.payOnArrival ? "Pay rider" : naira(options.rider.feeKobo),
        )}

      {method !== "pickup" && (
        <>
          <Field label="Delivery address" name="address" placeholder="e.g. 12 Opebi Road" autoComplete="street-address" defaultValue={state?.values?.address} />
        </>
      )}
      {method === "rider" && <p className="px-1 text-xs leading-relaxed text-muted">If you&apos;re not home when the rider comes, you pay for the return trip.</p>}

      <p className="pt-1 text-base font-extrabold">Your order</p>
      <section className="rounded-[18px] bg-white px-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
        {lines.map((l, i) => (
          <div key={l.id} className={`flex items-center gap-3 py-2.5 ${i < lines.length - 1 ? "border-b border-[#eef0f4]" : ""}`}>
            <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-chip">
{l.photo && <Photo src={l.photo} sizes="44px" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{[l.name, l.size].filter(Boolean).join(" · ")}</span>
              <span className="block text-xs font-medium text-muted">Qty {l.qty}</span>
            </span>
            <span className="text-sm font-extrabold">{naira(l.priceKobo * l.qty)}</span>
          </div>
        ))}
      </section>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">
          Note for the seller <span className="font-medium text-muted">(optional)</span>
        </span>
        <input
          name="note"
          maxLength={300}
          defaultValue={state?.values?.note}
          placeholder="e.g. Less sugar please"
          className="h-[52px] rounded-[14px] border border-[#d5dae4] bg-white px-3.5 text-[15px] outline-none placeholder:text-[#8a93a5] focus:border-ink"
        />
      </label>

      <Note>
        {hold ? (
          <>
            <b>Your money is safe.</b> We hold it until you tap “I’ve received it”. If the order never comes, you get it back.
          </>
        ) : (
          <>
            <b>Paid securely through Paystack.</b> If something goes wrong, report it within 48 hours of your delivery day.
          </>
        )}
      </Note>

      <div className="flex flex-col gap-2 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
        <div className="flex justify-between text-sm text-muted">
          <span>Items</span>
          <span>{naira(items)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted">
          <span>{feeLabel}</span>
          <span>{feeText}</span>
        </div>
        <div className="flex justify-between pt-1 text-[17px] font-extrabold">
          <span>Total</span>
          <span>{naira(items + fee)}</span>
        </div>
      </div>

      <ErrorText message={state?.error} />
      <PrimaryButton pending={pending}>Pay {naira(items + fee)}</PrimaryButton>
    </form>
  );
}
