import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailReady, emailUrl, escapeHtml, sendEmail } from "./email";

// Sends a bell notice by email too, if this person has a checked email and hasn't turned alerts off.
// Never throws: a failed email must not stop an order or a report.
export async function emailAlert(userId: string, title: string, body: string, link?: string) {
  try {
    if (!emailReady()) return;
    const [u] = await db
      .select({ name: users.name, email: users.email, verified: users.emailVerifiedAt, on: users.emailAlerts, guest: users.isGuest, suspended: users.suspendedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u?.email || !u.verified || !u.on || u.guest || u.suspended) return;
    const open = emailUrl(link ?? "/notifications");
    const off = emailUrl("/me/alerts");
    const first = u.name.split(" ")[0];
    await sendEmail(
      u.email,
      `${title} · Vouchly`,
      `Hi ${first},\n\n${body}\n\nOpen it on Vouchly: ${open}\n\nYou get these emails for new orders and problems. To stop them: ${off}`,
      `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px 16px;color:#14213d">
<p style="font-size:20px;font-weight:800;margin:0 0 20px">Vouchly</p>
<p style="margin:0 0 8px">Hi ${escapeHtml(first)},</p>
<p style="font-size:17px;font-weight:800;margin:0 0 6px">${escapeHtml(title)}</p>
<p style="margin:0 0 20px;line-height:1.5">${escapeHtml(body)}</p>
<p style="margin:0 0 28px"><a href="${open}" style="display:inline-block;background:#14213d;color:#fff;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:12px">Open on Vouchly</a></p>
<p style="font-size:12px;color:#6b7385;line-height:1.5;margin:0">You get these emails for new orders and problems. <a href="${off}" style="color:#2A4BD7">Turn them off</a>.</p>
</div>`,
    );
  } catch (e) {
    console.error("Alert email not sent:", e instanceof Error ? e.message : e);
  }
}
