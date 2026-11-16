import Link from "next/link";
import { naira } from "@/lib/catalog";
import { addDays, keyToDate } from "@/lib/dates";
import { deliveryDayLabel, telLink } from "@/lib/orders";
import type { Density } from "@/components/data/density";
import PrintButton from "@/components/print-button";
import { PackedBox } from "./packed-box";

export type DayRow = { code: string; method: string; buyer: string; phone: string; address: string | null; note: string | null; paidKobo: number; lines: string };
type Group = { title: string; rows: DayRow[] };

const local = (phone: string) => "0" + phone.slice(3);
const area = (r: DayRow) => r.address?.split(", ").pop() ?? "Other";

// Pickup, then drop-off by area, then rider.
function groups(rows: DayRow[]): Group[] {
  const out: Group[] = [];
  const pick = rows.filter((r) => r.method === "pickup");
  if (pick.length) out.push({ title: "Pickup", rows: pick });
  const drops = rows.filter((r) => r.method === "drop_off");
  for (const a of [...new Set(drops.map(area))].sort()) out.push({ title: `Drop-off · ${a}`, rows: drops.filter((r) => area(r) === a) });
  const rider = rows.filter((r) => r.method === "rider");
  if (rider.length) out.push({ title: "Rider", rows: rider });
  return out;
}

// The day list on a computer (and on paper): packing summary and one compact table per group.
export function DayDesk({ day, shopName, rows, pack, riderText, density }: { day: string; shopName: string; rows: DayRow[]; pack: [string, number][]; riderText: string | null; density: Density }) {
  const compact = density === "compact";
  const cell = `px-3 ${compact ? "h-9 text-[13px]" : "h-[52px] text-sm"} print:h-8 print:text-[12px]`;
  const head = "px-3 h-9 text-left text-xs font-extrabold text-muted print:text-black";
  const btn = "inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-bold text-ink";
  const totalQty = pack.reduce((n, [, q]) => n + q, 0);

  return (
    <main className="hidden px-8 py-6 lg:block print:block print:p-0 print:text-black">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted print:text-black">{shopName} · day list</p>
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{deliveryDayLabel(keyToDate(day))}</h1>
          <p className="text-sm text-muted print:text-black">
            {rows.length} {rows.length === 1 ? "order" : "orders"} · {totalQty} {totalQty === 1 ? "item" : "items"} to pack
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link href={`/shop/manage/orders/day/${addDays(day, -1)}`} className={btn} aria-label="Day before">
            ← Day before
          </Link>
          <Link href={`/shop/manage/orders/day/${addDays(day, 1)}`} className={btn} aria-label="Day after">
            Day after →
          </Link>
          <Link href={`/shop/manage/orders?day_from=${day}&day_to=${day}`} className={btn}>
            See in Orders
          </Link>
          {rows.length > 0 && (
            <span className="w-36">
              <PrintButton />
            </span>
          )}
          {riderText && (
            <a href={`https://wa.me/?text=${encodeURIComponent(riderText)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
              Send to rider
            </a>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] border-[1.5px] border-dashed border-[#c8ceda] p-8 text-center text-sm text-muted">No paid orders to deliver on this day.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="rounded-[16px] border border-line bg-white p-4 print:break-inside-avoid print:border-black/40">
            <h2 className="mb-2 text-xs font-extrabold text-muted print:text-black">TO PACK</h2>
            <ul className="grid grid-cols-3 gap-x-6 gap-y-1 xl:grid-cols-4 print:grid-cols-3">
              {pack.map(([name, n]) => (
                <li key={name} className="flex items-baseline justify-between gap-2 border-b border-line py-1 text-sm print:border-black/20">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="font-extrabold tabular-nums">× {n}</span>
                </li>
              ))}
            </ul>
          </section>

          {groups(rows).map((g) => (
            <section key={g.title} className="print:break-inside-avoid">
              <h2 className="mb-1.5 text-base font-extrabold">
                {g.title} <span className="text-sm font-semibold text-muted print:text-black">· {g.rows.length}</span>
              </h2>
              <div className="overflow-x-auto rounded-[16px] border border-line bg-white print:overflow-visible print:rounded-none print:border-black/40">
                <table className="w-full border-collapse" aria-label={g.title}>
                  <thead className="bg-[#F3F5FA] print:bg-white">
                    <tr className="border-b border-line print:border-black/40">
                      <th scope="col" className={head}>Order</th>
                      <th scope="col" className={head}>Buyer</th>
                      <th scope="col" className={head}>Phone</th>
                      {g.title !== "Pickup" && <th scope="col" className={head}>Address</th>}
                      <th scope="col" className={head}>Items</th>
                      <th scope="col" className={head}>Note</th>
                      <th scope="col" className={`${head} text-right`}>Paid</th>
                      <th scope="col" className={`${head} w-16 text-center`}>Packed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.code} className="border-b border-line align-middle last:border-b-0 print:border-black/20">
                        <td className={`${cell} whitespace-nowrap font-bold`}>
                          <Link href={`/shop/manage/orders?open=${r.code}`} className="hover:underline print:no-underline">
                            {r.code}
                          </Link>
                        </td>
                        <td className={`${cell} whitespace-nowrap font-semibold`}>{r.buyer}</td>
                        <td className={`${cell} whitespace-nowrap`}>
                          <a href={telLink(r.phone)} className="font-bold text-accent print:font-normal print:text-black">
                            {local(r.phone)}
                          </a>
                        </td>
                        {g.title !== "Pickup" && <td className={`${cell} max-w-[260px] py-1.5`}>{r.address}</td>}
                        <td className={`${cell} py-1.5 font-semibold`}>{r.lines}</td>
                        <td className={`${cell} max-w-[220px] py-1.5 text-muted print:text-black`}>{r.note}</td>
                        <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{naira(r.paidKobo)}</td>
                        <td className={`${cell} text-center`}>
                          <PackedBox day={day} code={r.code} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
