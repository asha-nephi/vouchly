import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { emailReady } from "@/lib/email";
import { BackBar, Note } from "@/components/ui";
import SubmitButton from "@/components/submit-button";
import { setEmailAlerts } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

// Email alerts on or off. The bell always gets every notice.
export default async function EmailAlerts({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (user.isGuest) redirect("/join?from=guest");
  const { saved } = await searchParams;
  const checked = !!user.email && !!user.emailVerifiedAt;
  const leader = user.role === "admin" || user.role === "ward_contact";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Email alerts" href="/me" />
      <div className="flex flex-col gap-4 px-4 pt-2">
        {saved && <Note tone="green">{user.emailAlerts ? "Email alerts are on." : "Email alerts are off. You'll still see everything under the bell."}</Note>}
        <section className={card}>
          <p className="text-[15px] font-extrabold">What we email</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-[#1E2A4A]">
            <li>A new order, booking or sign-up in your shop</li>
            <li>Someone asks you for a price</li>
            <li>A buyer reports a problem with an order</li>
            {leader && <li>A new member from your ward is waiting to be confirmed</li>}
          </ul>
          <p className="mt-2 text-[13px] text-muted">Everything else stays under the bell. We never email adverts.</p>
        </section>

        {!checked ? (
          <Note tone="amber">
            We can only email a checked address. Add and check your email in{" "}
            <Link href="/me/security" className="font-bold underline">
              Login and security
            </Link>
            .
          </Note>
        ) : !emailReady() ? (
          <Note>Email isn&apos;t switched on for Vouchly yet. Your choice is saved for when it is.</Note>
        ) : null}

        <form action={setEmailAlerts} className={`${card} flex items-center gap-3`}>
          <input type="hidden" name="on" value={user.emailAlerts ? "0" : "1"} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{user.emailAlerts ? "Email alerts are on" : "Email alerts are off"}</span>
            <span className="block truncate text-[13px] text-muted">{checked ? `Sent to ${user.email}` : "No checked email yet"}</span>
          </span>
          <SubmitButton pendingText="…" className={`h-10 shrink-0 rounded-full px-4 text-[13px] font-bold ${user.emailAlerts ? "border border-[#d5dae4] bg-white" : "bg-ink text-white"}`}>
            {user.emailAlerts ? "Turn off" : "Turn on"}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
