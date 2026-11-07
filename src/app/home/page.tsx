import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { logout } from "../actions";
import { Footer, Note } from "@/components/ui";

export const dynamic = "force-dynamic";

const steps = (confirmed: boolean) => [
  { label: "Invited by a member", done: true },
  { label: "Phone number checked", done: true },
  { label: "Ward contact confirms you", done: confirmed },
];

export default async function Home() {
  const user = await requireUser();
  const first = user.name.split(" ")[0];
  const shop = await myShop(user.id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex flex-col gap-5 px-4 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-accent">Vouchly</span>
          <form action={logout}>
            <button type="submit" className="text-[13px] font-bold text-muted">
              Log out
            </button>
          </form>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">Welcome, {first}</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">
            {user.confirmed ? "You're a verified member" : "Almost there"}
          </h1>
        </div>

        <section className="rounded-[20px] bg-white px-4 py-1.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          {steps(user.confirmed).map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3 py-3 ${i < 2 ? "border-b border-[#eef0f4]" : ""}`}>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-white ${s.done ? "bg-[#1b6b3a]" : "bg-[#e9b44c]"}`}
                aria-hidden="true"
              >
                {s.done ? "✓" : "…"}
              </span>
              <span className="flex-1 text-sm font-semibold">{s.label}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.done ? "bg-[#ddf3e4] text-[#1b6b3a]" : "bg-[#fdf0d5] text-[#7a4d06]"}`}
              >
                {s.done ? "Done" : "Waiting"}
              </span>
            </div>
          ))}
        </section>

        {!user.confirmed && (
          <Note>Your ward contact will confirm you soon. Shops open here as soon as the first sellers join.</Note>
        )}

        <section className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <div className="flex-1">
            <p className="text-[15px] font-bold">Invite a member</p>
            <p className="mt-0.5 text-[13px] text-muted">Share your code with someone you trust.</p>
          </div>
          <span className="rounded-xl bg-soft px-3 py-2 text-[17px] font-extrabold tracking-widest text-deep">
            {user.inviteCode}
          </span>
        </section>

        {user.role !== "member" && (
          <Link
            href="/admin/members"
            className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white"
          >
            Confirm new members
          </Link>
        )}

        {user.confirmed && (
          <Link href={shop ? "/shop/manage" : "/sell"} className="flex items-center gap-3 rounded-[22px] bg-ink p-[18px] text-white">
            <span className="flex-1">
              <span className="block text-base font-extrabold">{shop ? "My shop" : "Sell on Vouchly"}</span>
              <span className="mt-1 block text-[13px] leading-snug text-[#c9d1e3]">
                {shop ? `${shop.name} · ${shop.isOpen ? "open" : "closed"}` : "Set up your shop in about 5 minutes."}
              </span>
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-ink" aria-hidden="true">→</span>
          </Link>
        )}

        <div className="rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-5 text-center">
          <p className="text-[15px] font-bold">Shops are coming</p>
          <p className="mt-1 text-[13px] text-muted">Food, stays, repairs and more from members near you.</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
