// Calendar days as "YYYY-MM-DD" on the Lagos clock (UTC+1, no daylight saving).

const LAGOS = 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const isDayKey = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(Date.parse(k + "T00:00:00Z"));

export const todayKey = (now = new Date()) => new Date(now.getTime() + LAGOS).toISOString().slice(0, 10);

export const addDays = (key: string, n: number) => new Date(Date.parse(key + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);

// Midnight in Lagos on that day.
export const keyToDate = (key: string) => new Date(Date.parse(key + "T00:00:00Z") - LAGOS);

export const dateToKey = (d: Date) => new Date(d.getTime() + LAGOS).toISOString().slice(0, 10);

export const nightsBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// Each night of a stay, check-in day up to the day before check-out.
export function nightsOf(checkIn: string, checkOut: string) {
  const out: string[] = [];
  for (let k = checkIn; k < checkOut; k = addDays(k, 1)) out.push(k);
  return out;
}

export const weekday = (key: string) => new Date(key + "T00:00:00Z").getUTCDay();

// "Sat 14 Nov"
export const shortDay = (key: string) =>
  new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(key + "T00:00:00Z"));
