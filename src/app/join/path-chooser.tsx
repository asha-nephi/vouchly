import Link from "next/link";
import { chooseJoinPath } from "../actions";
import { SELLER_TYPES, SELLER_TYPE_IDS } from "@/lib/seller-types";
import { Note } from "@/components/ui";

const PATHS = [
  { id: "buy", title: "I want to buy or hire", body: "Shop products, book a pro, or learn online. Free, no invite needed.", note: "Takes 1 minute", bg: "#2A4BD7" },
  ...SELLER_TYPE_IDS.map((id) => ({ id, title: SELLER_TYPES[id].title, body: SELLER_TYPES[id].body, note: "Needs a member invite", bg: SELLER_TYPES[id].bg })),
];

const tick = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="hidden shrink-0 group-has-[:checked]:block">
    <circle cx="12" cy="12" r="11" fill="#2A4BD7" />
    <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Sign-up step 1: "What brings you to Vouchly?" Works without JavaScript.
export default function PathChooser({ code, fromGuest, existingBuyer, picked }: { code?: string; fromGuest?: boolean; existingBuyer?: boolean; picked?: string }) {
  const paths = existingBuyer ? PATHS.filter((p) => p.id !== "buy") : PATHS;
  const start = picked && paths.some((p) => p.id === picked) ? picked : existingBuyer ? "service" : "buy";
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3.5 lg:px-6">
          <Link href={existingBuyer ? "/home" : "/"} className="text-xl font-extrabold tracking-[-0.02em] text-ink lg:text-[22px]">
            Vouchly
          </Link>
          {!existingBuyer && (
            <p className="text-sm text-muted">
              <span className="hidden sm:inline">Already have an account? </span>
              <Link href="/login" className="font-extrabold text-accent">
                Log in
              </Link>
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pb-16 pt-7 lg:px-6 lg:pt-12">
        <form action={chooseJoinPath}>
          {code && <input type="hidden" name="code" value={code} />}
          <p className="mb-1.5 text-sm font-extrabold text-accent">Step 1 of 3</p>
          <h1 className="mb-2 text-[28px] font-extrabold tracking-[-0.03em] lg:text-[40px]">{existingBuyer ? "What will you sell?" : "What brings you to Vouchly?"}</h1>
          <p className="mb-6 text-base text-muted lg:mb-7">Pick one. You can add more later from your account.</p>
          {fromGuest && (
            <div className="mb-5">
              <Note>To see your orders anywhere, make a free buyer account. To sell, join with an invite from a member.</Note>
            </div>
          )}

          <fieldset className="grid gap-3 lg:grid-cols-2 lg:gap-3.5">
            <legend className="sr-only">Your path</legend>
            {paths.map((p) => (
              <label key={p.id} className="group block cursor-pointer">
                <input type="radio" name="path" value={p.id} data-pick={p.id} defaultChecked={p.id === start} className="peer sr-only" />
                <span className="flex h-full gap-4 rounded-[20px] border border-line bg-white p-[18px] peer-checked:border-2 peer-checked:border-accent peer-checked:p-[17px] peer-checked:shadow-[0_10px_28px_-18px_rgba(42,75,215,0.6)] peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 lg:p-5 lg:peer-checked:p-[19px]">
                  <span className="size-12 shrink-0 rounded-[14px]" style={{ background: p.bg }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-lg font-extrabold">
                      {p.title}
                      {tick}
                    </span>
                    <span className="mt-1 block text-sm leading-normal text-[#3A4458]">{p.body}</span>
                    <span className={`mt-2.5 block text-xs font-extrabold ${p.id === "buy" ? "text-[#1D7A46]" : "text-muted"}`}>{p.note}</span>
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {SELLER_TYPE_IDS.map((t) => (
            <section key={t} data-show={t} className="mt-6 rounded-[20px] border border-line bg-white p-[18px] lg:mt-7 lg:p-[22px]">
              <fieldset>
                <legend className="mb-1 text-lg font-extrabold">{SELLER_TYPES[t].ask}</legend>
                <p className="mb-3.5 text-sm text-muted">This decides where buyers find you. Pick all that fit.</p>
                <div className="flex flex-wrap gap-2">
                  {SELLER_TYPES[t].trades.map((label) => (
                    <label key={label} className="cursor-pointer">
                      <input type="checkbox" name="trade" value={label} className="peer sr-only" />
                      <span className="flex h-11 items-center rounded-full border border-[#D5DAE3] bg-white px-4 text-sm font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          ))}

          <div className="mt-6 flex flex-col gap-3.5 lg:mt-7 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-[52ch] text-sm text-muted">
              <span data-show="buy">Next: your name, email and phone number.</span>
              <span data-show="sell">Next: make your account, then add your invite code. Your ward contact confirms you; you can set up your shop while you wait.</span>
            </p>
            <button type="submit" className="flex h-[52px] items-center justify-center rounded-[14px] bg-ink px-7 text-base font-extrabold text-white">
              Continue
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
