import Link from "next/link";
import { Field } from "./ui";

// Name and phone for someone buying without an account.
export default function GuestFields({ values }: { values?: Record<string, string> }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
      <div>
        <p className="text-[15px] font-extrabold">Your details</p>
        <p className="text-[13px] text-muted">
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
