import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { maskPhone } from "@/lib/phone";
import { confirmMember } from "../../../actions";
import { BackBar } from "@/components/ui";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function Members() {
  const me = await requireUser();
  if (me.role !== "ward_contact" && me.role !== "admin") redirect("/home");

  const inviter = alias(users, "inviter");
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      ward: users.ward,
      confirmed: users.confirmed,
      invitedBy: inviter.name,
    })
    .from(users)
    .leftJoin(inviter, eq(inviter.id, users.invitedById))
    .where(eq(users.role, "member"))
    .orderBy(users.confirmed, desc(users.createdAt))
    .limit(200);

  const waiting = rows.filter((r) => !r.confirmed);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Members" href="/home" />
      <div className="flex flex-col gap-3 px-4">
        <p className="text-[13px] font-bold text-muted">Waiting to be confirmed ({waiting.length})</p>
        {waiting.length === 0 && (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-5 text-center text-sm text-muted">
            Nobody is waiting right now.
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <div className="flex-1">
              <p className="text-[15px] font-bold">{r.name}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {r.ward} · {maskPhone(r.phone)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Invited by {r.invitedBy ?? "founder"}</p>
            </div>
            {r.confirmed ? (
              <span className="rounded-full bg-[#ddf3e4] px-2.5 py-1 text-xs font-bold text-[#1b6b3a]">Confirmed</span>
            ) : (
              <form action={confirmMember}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton pendingText="…" className="h-10 rounded-full bg-ink px-4 text-[13px] font-bold text-white">
                  Confirm
                </SubmitButton>
              </form>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
