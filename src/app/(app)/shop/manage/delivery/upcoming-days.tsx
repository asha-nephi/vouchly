import Link from "next/link";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { addDays, dateToKey, keyToDate, shortDay, todayKey, weekday } from "@/lib/dates";
import { OPEN } from "@/lib/order-status";
import { getDensity } from "@/components/data/density";

const DAYS = 14;

// Computers: the next two weeks of delivery days, with what's on each, linking to the day list.
export async function UpcomingDays({ shopId, deliveryDays }: { shopId: string; deliveryDays: number[] }) {
  const today = todayKey();
  const [rows, density] = await Promise.all([
    db
      .select({ id: orders.id, day: orders.deliveryDay, method: orders.method })
      .from(orders)
      .where(and(eq(orders.shopId, shopId), inArray(orders.status, [...OPEN]), inArray(orders.method, ["pickup", "drop_off", "rider"]), gte(orders.deliveryDay, keyToDate(today)), lt(orders.deliveryDay, keyToDate(addDays(today, DAYS))))),
    getDensity("seller"),
  ]);
  const qty = rows.length ? await db.select({ orderId: orderItems.orderId, n: orderItems.quantity }).from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id))) : [];

  // Your usual delivery days, plus any other day that has orders.
  const keys = new Set<string>();
  for (let i = 0; i < DAYS; i++) if (deliveryDays.includes(weekday(addDays(today, i)))) keys.add(addDays(today, i));
  for (const r of rows) keys.add(dateToKey(r.day));
  const list = [...keys].sort().map((k) => {
    const on = rows.filter((r) => dateToKey(r.day) === k);
    const ids = new Set(on.map((r) => r.id));
    return {
      key: k,
      orders: on.length,
      pickup: on.filter((r) => r.method === "pickup").length,
      drop: on.filter((r) => r.method === "drop_off").length,
      rider: on.filter((r) => r.method === "rider").length,
      items: qty.filter((q) => ids.has(q.orderId)).reduce((n, q) => n + q.n, 0),
    };
  });

  const cell = `px-3 ${density === "compact" ? "h-9 text-[13px]" : "h-[52px] text-sm"}`;
  const head = "px-3 h-9 text-xs font-extrabold text-muted";
  const num = (n: number) => (n ? n : <span className="text-[#b4bccb]">0</span>);
  return (
    <section className="mx-auto hidden max-w-4xl px-8 pt-6 lg:block print:hidden" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="text-[22px] font-extrabold tracking-[-0.02em]">
        Coming up
      </h2>
      <p className="mb-3 text-sm text-muted">Your next two weeks of delivery days. Open a day for the packing list.</p>
      <div className="overflow-hidden rounded-[16px] border border-line bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-[#F3F5FA]">
            <tr className="border-b border-line">
              <th scope="col" className={`${head} text-left`}>Day</th>
              <th scope="col" className={`${head} text-right`}>Orders</th>
              <th scope="col" className={`${head} text-right`}>Pickup</th>
              <th scope="col" className={`${head} text-right`}>Drop-off</th>
              <th scope="col" className={`${head} text-right`}>Rider</th>
              <th scope="col" className={`${head} text-right`}>Items to pack</th>
              <th scope="col" className={head}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">
                  No delivery days in the next two weeks. Pick your days below.
                </td>
              </tr>
            )}
            {list.map((d) => (
              <tr key={d.key} className="border-b border-line last:border-b-0 hover:bg-[#F3F5FA]">
                <td className={`${cell} font-bold`}>
                  {shortDay(d.key)}
                  {d.key === today && <span className="ml-2 rounded-full bg-soft px-2 py-0.5 text-[11px] font-bold text-deep">Today</span>}
                </td>
                <td className={`${cell} text-right font-bold tabular-nums`}>{num(d.orders)}</td>
                <td className={`${cell} text-right tabular-nums`}>{num(d.pickup)}</td>
                <td className={`${cell} text-right tabular-nums`}>{num(d.drop)}</td>
                <td className={`${cell} text-right tabular-nums`}>{num(d.rider)}</td>
                <td className={`${cell} text-right tabular-nums`}>{num(d.items)}</td>
                <td className={`${cell} text-right`}>
                  <Link href={`/shop/manage/orders/day/${d.key}`} className="font-bold text-accent hover:underline">
                    Day list<span className="sr-only"> for {shortDay(d.key)}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
