import "server-only";
import { OAuth2Client } from "google-auth-library";
import { siteUrl } from "@/lib/site";

export const GOOGLE_PENDING_COOKIE = "vl_google_signup";

export function googleReady(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google sign-in is not set up yet.");
  const site = siteUrl();
  return new OAuth2Client(clientId, clientSecret, new URL("/auth/google/callback", site).toString());
}
