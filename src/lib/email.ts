import "server-only";

export function emailReady(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) throw new Error("Email is not set up. Add the Resend settings and try again.");

  // RESEND_BASE_URL is only for local testing with a fake server.
  const response = await fetch(`${process.env.RESEND_BASE_URL ?? "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  if (!response.ok) throw new Error(`Email could not be sent (${response.status}). Please try again.`);
}

export function emailUrl(path: string): string {
  return new URL(path, process.env.SITE_URL ?? "http://localhost:3000").toString();
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
