"use client";

import { useActionState, useState } from "react";
import GuestFields from "@/components/guest-fields";
import { placeOrder } from "./actions";
import { AREAS } from "@/lib/catalog";
import { ErrorText, Field } from "@/components/ui";
import { Select } from "@/components/form-bits";
import ActionBar from "@/components/action-bar";
import DiscountField from "@/components/discount-field";
import Protection from "@/components/protection";
import Seal from "@/components/seal";
import TilePhoto from "@/components/tile-photo";

type Line = { id: string; name: string; size: string | null; photo: string | null; priceKobo: number; qty: number };
type Options = {
  pickup: { spot: string; hours: string | null } | null;
  dropOff: { areas: string[]; feeKobo: number } | null;
  rider: { payOnArrival: boolean; feeKobo: number; estimate: string | null } | null;
};

const naira = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

// A numbered section title.
const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <h2 className="mb-3 flex items-center gap-2.5 text-[17px] font-extrabold">
    <span className="grid size-[26px] place-items-center rounded-full bg-ink text-[13px] text-white" aria-hidden="true">
      {n}
    </span>
    {children}
  </h2>
);

export default function CheckoutForm(props: {
  shopName: string;
  confirmed: boolean;
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
  const [noteOpen, setNoteOpen] = useState(!!state?.values?.note);

  const items = lines.reduce((s, l) => s + l.priceKobo * l.qty, 0);
  const dropOk = !!options.dropOff?.areas.includes(area);
  const fee = method === "drop_off" ? options.dropOff?.feeKobo ?? 0 : method === "rider" && options.rider && !options.rider.payOnArrival ? options.rider.feeKobo : 0;
  const feeLabel = { pickup: "Pickup", drop_off: "Seller drop-off", rider: "Rider" }[method as "pickup"] ?? "Delivery";
  const riderOnArrival = method === "rider" && options.rider?.payOnArrival;
  const total = items + fee;
  const step = props.guest ? 1 : 0; // numbers shift when there's no "Your details"

  // A choice card. The chosen one gets a 2px blue border.
  const choice = (value: string, title: string, detail: string, right: { text: string; free?: boolean } | null, disabled = false) => (
    <label className={disabled ? "opacity-50" : "cursor-pointer"}>
      <input type="radio" name="method" value={value} checked={method === value} disabled={disabled} onChange={() => setMethod(value)} className="peer sr-only" />
      <span
        className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          method === value ? "border-2 border-accent" : "border border-line"
        }`}
        style={method === value ? { padding: "13px 15px" } : undefined}
      >
        <span
          className={`size-5 shrink-0 rounded-full border-2 ${method === value ? "border-[6px] border-accent" : "border-[#a3abba]"}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{detail}</span>
        </span>
        {right && <span className={`shrink-0 text-sm font-extrabold tabular-nums ${right.free ? "text-[#1D7A46]" : "text-muted"}`}>{right.text}</span>}
      </span>
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-[22px] px-4 pt-1">
      <section className="rounded-[18px] border border-line bg-white p-3.5">
        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <span className="truncate">{shopName}</span>
          {props.confirmed && <Seal size={14} />}
        </p>
        {lines.map((l, i) => (
          <div key={l.id} className={`flex items-center gap-3 py-2.5 ${i === 0 ? "pt-0" : ""} ${i < lines.length - 1 ? "border-b border-line" : ""}`}>
            <span className="shimmer relative size-14 shrink-0 overflow-hidden rounded-[14px]">
              <TilePhoto src={l.photo} name={l.name} sizes="56px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-snug">
                {l.name} × {l.qty}
              </span>
              {l.size && <span className="block text-[13px] font-semibold text-muted">{l.size}</span>}
            </span>
            <span className="text-[15px] font-extrabold tabular-nums">{naira(l.priceKobo * l.qty)}</span>
          </div>
        ))}
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5 text-[13px] font-bold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A4BD7" strokeWidth="2" strokeLinecap="round" className="shrink-0" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {dayLabel ? `Ready on ${dayLabel}` : "Delivery day not set yet"}
        </p>
      </section>

      {props.guest && <GuestFields values={state?.values} step={1} />}

      <section>
        <Step n={step + 1}>How do you want it?</Step>
        <div className="flex flex-col gap-2.5">
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
          {options.pickup && choice("pickup", "Pick up", [options.pickup.spot, options.pickup.hours].filter(Boolean).join(" · "), { text: "Free", free: true })}
          {options.dropOff &&
            choice(
              "drop_off",
              "Seller drops it off",
              dropOk ? `${shopName} brings it to you in ${area}` : `Only in ${options.dropOff.areas.join(", ")}`,
              options.dropOff.feeKobo ? { text: naira(options.dropOff.feeKobo) } : { text: "Free", free: true },
              !dropOk,
            )}
          {options.rider &&
            choice(
              "rider",
              "Rider (Bolt or dispatch)",
              options.rider.payOnArrival ? `About ${options.rider.estimate}. You pay the rider when it arrives.` : "The seller books a rider for you.",
              options.rider.payOnArrival ? null : { text: naira(options.rider.feeKobo) },
            )}
          {method !== "pickup" && <Field label="Delivery address" name="address" placeholder="e.g. 12 Opebi Road" autoComplete="street-address" defaultValue={state?.values?.address} />}
          {method === "rider" && <p className="px-1 text-xs leading-relaxed text-muted">If you&apos;re not home when the rider comes, you pay for the return trip.</p>}
        </div>
      </section>

      <section>
        <Step n={step + 2}>Check and pay</Step>
        <div className="rounded-[18px] border border-line bg-white p-4">
          <p className="mb-2 flex justify-between text-sm font-semibold text-muted">
            Items <span className="font-bold text-ink tabular-nums">{naira(items)}</span>
          </p>
          <p className="mb-3 flex justify-between text-sm font-semibold text-muted">
            {feeLabel}
            {riderOnArrival ? (
              <span className="font-bold text-muted">Paid to rider</span>
            ) : fee ? (
              <span className="font-bold text-ink tabular-nums">{naira(fee)}</span>
            ) : (
              <span className="font-bold text-[#1D7A46]">Free</span>
            )}
          </p>
          <p className="flex justify-between border-t border-line pt-3 text-lg font-extrabold">
            Total <span className="tabular-nums">{naira(total)}</span>
          </p>
        </div>

        <div className="mt-2.5 flex flex-col gap-2.5">
          <DiscountField value={state?.values?.discount} />
          {noteOpen ? (
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
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} className="h-12 w-full rounded-[14px] border border-dashed border-[#B8C2D6] text-sm font-bold text-accent">
              Add a note for the seller
            </button>
          )}
        </div>

        <div className="mt-3.5">
          <Protection hold={hold} short />
        </div>
        <p className="mx-1 mt-3 text-[13px] leading-relaxed text-muted">You&apos;ll pay on Paystack&apos;s secure page by card, transfer or USSD.</p>
      </section>

      <ErrorText message={state?.error} />
      <ActionBar>
        <button
          type="submit"
          disabled={pending}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-ink text-base font-extrabold tabular-nums text-white disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {pending ? "Please wait…" : `Pay ${naira(total)}`}
        </button>
      </ActionBar>
    </form>
  );
}
