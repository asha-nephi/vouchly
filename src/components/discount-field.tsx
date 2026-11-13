// Tucked away until needed: most buyers won't have a code.
export default function DiscountField({ value }: { value?: string }) {
  return (
    <details className="rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]" open={!!value}>
      <summary className="cursor-pointer text-[15px] font-bold">Have a discount code?</summary>
      <input
        name="discount"
        defaultValue={value}
        placeholder="e.g. WELCOME10"
        autoCapitalize="characters"
        autoComplete="off"
        className="mt-2.5 h-[50px] w-full rounded-[14px] border border-[#d5dae4] bg-white px-3.5 uppercase outline-none placeholder:normal-case placeholder:text-[#8a93a5] focus:border-ink"
      />
      <p className="mt-1.5 text-xs text-muted">The discount comes off when you pay.</p>
    </details>
  );
}
