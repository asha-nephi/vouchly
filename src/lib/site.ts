// The public address of the site. On the live server this never falls back to the
// address the request came in on, because behind Render that is "localhost:10000".
export const LIVE_SITE = "https://vouchly-af24.onrender.com";

export function siteUrl(from?: string): string {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NODE_ENV === "production") return LIVE_SITE;
  return from ?? "http://localhost:3000";
}
