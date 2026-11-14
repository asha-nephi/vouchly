import Seal from "@/components/seal";

const lock = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A4BD7" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
const alert = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A4BD7" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5v.5" />
  </svg>
);

// "How you're protected". The payment line depends on how payouts work.
export default function Protection({ hold, ward, short }: { hold: boolean; ward?: string; short?: boolean }) {
  const pay = hold ? "You pay through Paystack. Vouchly keeps your money until your order is done." : "You pay through Paystack. Never send money to a seller's own account.";
  const lines = [
    { icon: <Seal size={20} />, text: ward ? `The seller is a confirmed member from ${ward}.` : "The seller is a confirmed member." },
    { icon: lock, text: pay },
    { icon: alert, text: "Something wrong? Report it within 48 hours and we help sort it out." },
  ];
  if (short) {
    return (
      <p className="flex items-start gap-2.5 rounded-[14px] bg-soft px-3.5 py-3 text-[13px] leading-snug text-[#1E2A4A]">
        {lock}
        <span>
          {hold ? "Paid safely through Paystack. Vouchly keeps your money until your order is done." : "Paid safely through Paystack."} Problem? Report it within 48 hours.
        </span>
      </p>
    );
  }
  return (
    <section className="rounded-[18px] bg-soft p-4">
      <h2 className="mb-2.5 text-base font-extrabold">How you&apos;re protected</h2>
      <div className="flex flex-col gap-2.5">
        {lines.map((l, i) => (
          <p key={i} className="flex gap-2.5 text-sm leading-snug text-[#1E2A4A]">
            {l.icon}
            {l.text}
          </p>
        ))}
      </div>
    </section>
  );
}
