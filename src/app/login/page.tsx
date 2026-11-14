import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { currentUser } from "@/lib/auth";
import { emailReady } from "@/lib/email";
import { googleReady } from "@/lib/google";

export const dynamic = "force-dynamic";

const GOOGLE_ERRORS: Record<string, string> = {
  failed: "Google sign-in didn't work. Please try again.",
  link: "This account already exists. Sign in another way, then connect Google in Login and security.",
  email: "That Google email belongs to another account.",
  used: "That Google account is already connected to a different Vouchly account.",
  unavailable: "Google sign-in is not set up yet.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ google?: string; email?: string }> }) {
  const query = await searchParams;
  const me = await currentUser();
  if (me && !me.isGuest) redirect(query.email === "verified" ? "/me/security?email=done" : "/home");
  const googleError = query.google ? GOOGLE_ERRORS[query.google] ?? GOOGLE_ERRORS.failed : undefined;
  return <LoginForm googleEnabled={googleReady()} emailEnabled={emailReady()} googleError={googleError} emailExpired={query.email === "expired"} emailVerified={query.email === "verified"} emailTaken={query.email === "taken"} />;
}
