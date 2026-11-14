import Link from "next/link";
import { Field } from "./ui";

// Name and phone for someone buying without an account. `step` adds a numbered heading.
export default function GuestFields({ values, step }: { values?: Record<string, string>; step?: number }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4">
      <div>
        <p className="flex items-center gap-2.5 text-[17px] font-extrabold">
          {step && (
            <span className="grid size-[26px] place-items-center rounded-full bg-ink text-[13px] text-white" aria-hidden="true">
              {step}
            </span>
          )}
          Your details
        </p>
        <p className="mt-1 text-[13px] text-muted">
          So the seller can reach you. Have an account?{" "}
          <Link href="/login" className="font-bold text-accent">
            Log in
          </Link>
        </p>
      </div>
      <Field label="Your name" name="guestName" autoComplete="name" placeholder="e.g. Tolu Adebayo" defaultValue={values?.guestName} />
      <Field label="Phone number" name="guestPhone" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" defaultValue={values?.guestPhone} />
      <Field
        label="Email"
        name="guestEmail"
        type="email"
        autoComplete="email"
        placeholder="For your receipt"
        required={false}
        defaultValue={values?.guestEmail}
      />
    </section>
  );
}
