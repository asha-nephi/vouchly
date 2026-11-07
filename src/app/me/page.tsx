import Link from "next/link";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { logout } from "../actions";
import { Footer, Note } from "@/components/ui";
import TabBar from "@/components/tab-bar";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

export default async function Me() {
  const user = await requireUser();
  const shop = await myShop(user.id);
  const count = async (where: ReturnType<typeof and>) =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where))[0]?.n ?? 0;
  const [newOrders, problems] = await Promise.all([
    shop ? count(and(eq(orders.shopId, shop.id), inArray(orders.status, ["paid", "disputed"]))) : 0,
    user.role === "admin" ? count(eq(orders.status, "disputed")) : 0,
  ]);
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const steps = [
    { label: "Invited by a member", done: true },
    { label: "Phone number checked", done: true },
    { label: "Ward contact confirms you", done: user.confirmed },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex flex-col gap-4 px-4 pt-5">
        <h1 className="text-[26px] font-extrabold tracking-tight">Me</h1>

        <section className={`${card} flex items-center gap-3.5 p-4`}>
          <span className="flex size-[60px] items-center justify-center rounded-full bg-ink text-xl font-extrabold text-white">{initials}</span>
          <div>
            <p className="text-lg font-extrabold">{user.name}</p>
            <p className="text-[13px] text-muted">
              {user.ward}
              {user.area ? ` · ${user.area}` : ""}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${user.confirmed ? "bg-soft text-deep" : "bg-[#fdf0d5] text-[#7a4d06]"}`}
            >
              {user.confirmed ? "Verified member" : "Waiting for confirmation"}
            </span>
          </div>
        </section>

        {!user.confirmed && (
          <section className={`${card} px-4 py-1.5`}>
            {steps.map((s, i) => (
              <div key={s.label} className={`flex items-center gap-3 py-3 ${i < 2 ? "border-b border-[#eef0f4]" : ""}`}>
                <span className={`flex size-6 items-center justify-center rounded-full text-xs text-white ${s.done ? "bg-[#1b6b3a]" : "bg-[#e9b44c]"}`} aria-hidden="true">
                  {s.done ? "✓" : "…"}
                </span>
                <span className="flex-1 text-sm font-semibold">{s.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.done ? "bg-[#ddf3e4] text-[#1b6b3a]" : "bg-[#fdf0d5] text-[#7a4d06]"}`}>
                  {s.done ? "Done" : "Waiting"}
                </span>
              </div>
            ))}
          </section>
        )}

        {user.confirmed ? (
          <Link href={shop ? "/shop/manage" : "/sell"} className="flex items-center gap-3 rounded-[22px] bg-ink p-[18px] text-white">
            <span className="flex-1">
              <span className="block text-base font-extrabold">{shop ? "My shop" : "Sell on Vouchly"}</span>
              <span className="mt-1 block text-[13px] leading-snug text-[#c9d1e3]">
                {shop
                  ? `${shop.name} · ${shop.isOpen ? "open" : "closed"}${newOrders ? ` · ${newOrders} need${newOrders === 1 ? "s" : ""} you` : ""}`
                  : "Set up your shop in about 5 minutes."}
              </span>
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-ink" aria-hidden="true">
              →
            </span>
          </Link>
        ) : (
          <Note>You can open a shop once you&apos;re confirmed.</Note>
        )}

        <section className={`${card} flex items-center gap-3 p-4`}>
          <div className="flex-1">
            <p className="text-[15px] font-bold">Invite a member</p>
            <p className="mt-0.5 text-[13px] text-muted">Share your code with someone you trust.</p>
          </div>
          <span className="rounded-xl bg-soft px-3 py-2 text-[17px] font-extrabold tracking-widest text-deep">{user.inviteCode}</span>
        </section>

        <section className={`${card} px-4`}>
          {user.role === "admin" && (
            <Link href="/admin/problems" className="flex items-center justify-between border-b border-[#eef0f4] py-4 text-[15px] font-semibold">
              Problems reported
              <span className={`text-sm ${problems ? "font-bold text-[#b42318]" : "font-medium text-muted"}`}>{problems} ›</span>
            </Link>
          )}
          {user.role !== "member" && (
            <Link href="/admin/members" className="flex items-center justify-between border-b border-[#eef0f4] py-4 text-[15px] font-semibold">
              Confirm new members <span aria-hidden="true">›</span>
            </Link>
          )}
          <Link href="/orders" className="flex items-center justify-between border-b border-[#eef0f4] py-4 text-[15px] font-semibold">
            My orders <span aria-hidden="true">›</span>
          </Link>
          <Link href="/area" className="flex items-center justify-between border-b border-[#eef0f4] py-4 text-[15px] font-semibold">
            My area <span className="text-sm font-medium text-muted">{user.area ?? "Ikeja"} ›</span>
          </Link>
          <Link href="/contact" className="flex items-center justify-between border-b border-[#eef0f4] py-4 text-[15px] font-semibold">
            Contact us <span aria-hidden="true">›</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="w-full py-4 text-left text-[15px] font-semibold text-[#b42318]">
              Log out
            </button>
          </form>
        </section>
      </div>
      <Footer />
      <TabBar active="Me" />
    </main>
  );
}
