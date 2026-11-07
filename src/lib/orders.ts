import { randomInt } from "node:crypto";
import { DAY_KEYS } from "./catalog";

// Lagos is UTC+1 all year (no daylight saving).
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export const OUR_SHARE = 0.05; // 5% of the items, not the delivery fee
export const ourShareKobo = (itemsKobo: number) => Math.round(itemsKobo * OUR_SHARE);

// Next delivery day whose order deadline hasn't passed yet. Returned as midnight Lagos time.
// inStockOnly: ready-made items skip the weekly deadline and go on the next delivery day after today.
export function nextDeliveryDay(deliveryDays: number[], cutoff: string, now = new Date(), inStockOnly = false): Date | null {
  if (!deliveryDays.length) return null;
  if (inStockOnly) {
    const l = new Date(now.getTime() + LAGOS_OFFSET_MS);
    for (let add = 1; add < 8; add++) {
      const day = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() + add));
      if (deliveryDays.includes(day.getUTCDay())) return new Date(day.getTime() - LAGOS_OFFSET_MS);
    }
    return null;
  }
  const [cutDayKey, cutTime = "18:00"] = cutoff.split(" ");
  const cutDay = DAY_KEYS.indexOf(cutDayKey as (typeof DAY_KEYS)[number]);
  const [ch, cm] = cutTime.split(":").map(Number);
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS); // read with getUTC* = Lagos clock

  for (let add = 0; add < 21; add++) {
    const day = new Date(Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() + add));
    if (!deliveryDays.includes(day.getUTCDay())) continue;
    // Deadline = the last cut-off weekday on or before the delivery day.
    const back = cutDay < 0 ? 1 : (day.getUTCDay() - cutDay + 7) % 7;
    const deadline = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - back, ch, cm));
    if (lagosNow < deadline) return new Date(day.getTime() - LAGOS_OFFSET_MS);
  }
  return null;
}

// "Saturday, 15 November"
export function deliveryDayLabel(d: Date) {
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(d);
}

// VL-48213
export const makeOrderCode = () => `VL-${randomInt(10000, 99999)}`;

// Fake email for Paystack, which needs one. Buyers sign in by phone.
export const payEmail = (phone: string, email?: string | null) => email || `${phone}@buyers.vouchly.app`;

// Pilot: Paystack pays sellers automatically. Hold: we keep it until "Received" (needs a registered business).
export const holdMode = () => process.env.PAYOUT_MODE === "hold";
