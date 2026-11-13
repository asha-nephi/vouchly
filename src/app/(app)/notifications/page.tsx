import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireBuyer } from "@/lib/auth";
import SubmitButton from "@/components/submit-button";
import TabBar from "@/components/tab-bar";
import { BackBar } from "@/components/ui";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

// Picks an icon and colour from what the notice is about.
function look(title: string) {
  const t = title.toLowerCase();
  if (t.includes("received") || t.includes("released") || t.includes("closed")) return { bg: "bg-[#ddf3e4]", fg: "#1b6b3a", d: "M5 12.5l4.5 4.5L19 7.5" };
  if (t.includes("problem")) return { bg: "bg-[#fbebeb]", fg: "#b42318", d: "M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" };
  if (t.includes("cancel")) return { bg: "bg-chip", fg: "#3a4458", d: "M18 6L6 18M6 6l12 12" };
  if (t.includes("review")) return { bg: "bg-[#fdf0d5]", fg: "#b26b00", d: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" };
  if (t.includes("rider")) return { bg: "bg-soft", fg: "#1e39a8", d: "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM7 17H3V6h11v11M14 9h4l3 4v4h-2" };
  if (t.includes("new order")) return { bg: "bg-[#ddf3e4]", fg: "#1b6b3a", d: "M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0" };
  return { bg: "bg-soft", fg: "#1e39a8", d: "M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" };
}

// "Just now", "5 min ago", "3:40 pm", "Mon 9 Nov"
function when(d: Date, now: Date) {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const day = (x: Date) => new Intl.DateTimeFormat("en-NG", { dateStyle: "short", timeZone: "Africa/Lagos" }).format(x);
  if (day(d) === day(now)) return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(d);
  return new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);
}

export default async function Notifications() {
  const user = await requireBuyer();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(60);
  const now = new Date();
  const unread = rows.filter((r) => !r.read).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <BackBar title="Notifications" href={user.isGuest ? "/orders" : "/home"} />
      <div className="flex flex-col gap-2.5 px-4">
        {unread > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-muted">{unread} new</p>
            <form action={markAllRead}>
              <SubmitButton pendingText="…" className="text-[13px] font-bold text-accent">
                Mark all as read
              </SubmitButton>
            </form>
          </div>
        )}

        {rows.length === 0 && (
          <div className="mt-4 rounded-[22px] border-[1.5px] border-dashed border-[#c8ceda] p-8 text-center">
            <p className="text-[15px] font-bold">Nothing yet</p>
            <p className="mt-1 text-[13px] text-muted">Order updates, new orders and reviews will show here.</p>
          </div>
        )}

        {rows.map((n) => {
          const l = look(n.title);
          return (
            <Link
              key={n.id}
              href={`/notifications/${n.id}`}
              prefetch={false}
              className={`flex gap-3 rounded-[20px] p-3.5 ${n.read ? "bg-white/60" : "bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]"}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${l.bg}`}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={l.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={l.d} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`text-[15px] ${n.read ? "font-semibold text-[#3a4458]" : "font-extrabold"}`}>{n.title}</span>
                  <span className="shrink-0 text-xs text-muted">{when(n.createdAt, now)}</span>
                </span>
                <span className={`mt-0.5 block text-[13px] leading-snug ${n.read ? "text-muted" : "text-[#3a4458]"}`}>{n.body}</span>
              </span>
              {!n.read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" aria-label="New" />}
            </Link>
          );
        })}
      </div>
      <TabBar active="Me" />
    </main>
  );
}
