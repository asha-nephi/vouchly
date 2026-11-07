"use client";

import Link from "next/link";
import { createContext, useContext, useState, useTransition } from "react";
import { setBasketQty } from "@/app/basket/actions";

// Shared basket state for one page: steppers update it, the bottom bar reads it.
type Ctx = {
  qty: Record<string, number>;
  count: number;
  totalKobo: number;
  pending: boolean;
  change: (productId: string, qty: number) => void;
};
const BasketCtx = createContext<Ctx | null>(null);

const naira = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export function BasketProvider({
  children,
  initialQty,
  initialCount,
  initialTotal,
}: {
  children: React.ReactNode;
  initialQty: Record<string, number>;
  initialCount: number;
  initialTotal: number;
}) {
  const [qty, setQty] = useState(initialQty);
  const [count, setCount] = useState(initialCount);
  const [totalKobo, setTotal] = useState(initialTotal);
  const [conflict, setConflict] = useState<{ shop: string; productId: string; qty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(productId: string, next: number, replace = false) {
    const before = qty[productId] ?? 0;
    setQty((q) => ({ ...q, [productId]: next })); // show it straight away
    setError(null);
    start(async () => {
      const res = await setBasketQty(productId, next, replace);
      if (res.ok) {
        setCount(res.count);
        setTotal(res.totalKobo);
        if (replace) setQty({ [productId]: next });
      } else {
        setQty((q) => ({ ...q, [productId]: before }));
        if (res.conflict) setConflict({ shop: res.conflict, productId, qty: next });
        else setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <BasketCtx.Provider value={{ qty, count, totalKobo, pending, change: (id, n) => send(id, n) }}>
      {children}
      {error && (
        <p role="alert" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl bg-[#fbebeb] px-4 py-3 text-[13px] font-semibold text-[#b42318]">
          {error}
        </p>
      )}
      {conflict && (
        <div role="dialog" aria-modal="true" aria-labelledby="conflict-title" className="fixed inset-0 z-40 flex items-end bg-ink/40">
          <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <p id="conflict-title" className="text-lg font-extrabold">
              Start a new basket?
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Your basket has items from <b className="text-ink">{conflict.shop}</b>. Each order is from one shop, so we&apos;ll clear it first.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConflict(null)} className="h-[50px] rounded-2xl border border-[#d5dae4] font-bold">
                Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  send(conflict.productId, conflict.qty, true);
                  setConflict(null);
                }}
                className="h-[50px] rounded-2xl bg-ink font-bold text-white"
              >
                Start new
              </button>
            </div>
          </div>
        </div>
      )}
    </BasketCtx.Provider>
  );
}

function useBasket() {
  const c = useContext(BasketCtx);
  if (!c) throw new Error("BasketProvider missing");
  return c;
}

export function Stepper({ productId, name, disabled }: { productId: string; name: string; disabled?: boolean }) {
  const { qty, change } = useBasket();
  const n = qty[productId] ?? 0;
  if (disabled) return null;
  if (n === 0) {
    return (
      <button
        type="button"
        onClick={() => change(productId, 1)}
        aria-label={`Add ${name}`}
        className="flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-bold text-white"
      >
        Add
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => change(productId, n - 1)}
        aria-label={`One less ${name}`}
        className="flex size-9 items-center justify-center rounded-full border border-[#d5dae4] bg-white text-lg"
      >
        −
      </button>
      <span className="w-6 text-center font-extrabold" aria-live="polite">
        {n}
      </span>
      <button
        type="button"
        onClick={() => change(productId, Math.min(n + 1, 99))}
        aria-label={`One more ${name}`}
        className="flex size-9 items-center justify-center rounded-full bg-ink text-lg text-white"
      >
        +
      </button>
    </div>
  );
}

// "View basket" bar that sits above the tab bar.
export function BasketBar() {
  const { count, totalKobo, pending } = useBasket();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 px-4">
      <Link
        href="/basket"
        className={`mx-auto flex h-[54px] max-w-md items-center justify-between rounded-2xl bg-ink px-[18px] text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(20,33,61,0.25)] ${pending ? "opacity-80" : ""}`}
      >
        <span>
          View basket · {count} {count === 1 ? "item" : "items"}
        </span>
        <span>{naira(totalKobo)}</span>
      </Link>
    </div>
  );
}
