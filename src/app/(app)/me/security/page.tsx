import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { googleReady } from "@/lib/google";
import { emailReady } from "@/lib/email";
import { BackBar, Note } from "@/components/ui";
import { resendVerificationEmail } from "@/app/actions";
import SubmitButton from "@/components/submit-button";
import LoginSecurityForm from "./security-form";

export const dynamic = "force-dynamic";

export default async function LoginSecurity({ searchParams }: { searchParams: Promise<{ email?: string; google?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  if (user.isGuest) redirect("/join?from=guest");
  const canEditEmail = emailReady() || (!!user.email && !!user.emailVerifiedAt);

  const message =
    query.email === "pending" ? "Check your email for a verification link."
      : query.email === "failed" ? "Your account was created, but the verification email could not be sent. Try again below."
        : query.email === "sent" ? "A new verification link is on its way."
      : query.email === "verified" ? "Your email is already verified."
          : query.email === "done" ? "Your email is verified. You can now log in with your email and password."
          : query.email === "wait" ? "We couldn’t send it just now. Please wait a minute and try again."
        : query.email === "missing" ? "Add an email address first."
        : query.email === "taken" ? "Another account has already verified that email. Use a different email."
          : query.google === "connected" ? "Google is connected to your account."
            : query.google === "email-mismatch" ? "Use the same email address as this account to connect Google."
              : query.google === "email-used" ? "That email belongs to another Vouchly account."
                : query.google === "used" ? "That Google account is already connected elsewhere."
                  : query.google === "failed" ? "Google could not be connected. Please try again."
                    : null;
  const tone = query.email === "pending" || query.email === "sent" || query.email === "verified" || query.email === "done" || query.google === "connected" ? "green" : "amber";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Login and security" href="/me" />
      <div className="flex flex-col gap-4 px-4 pt-2">
        {message && <Note tone={tone}>{message}</Note>}
        <section className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <h1 className="text-[17px] font-extrabold">Email and password</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Add an email and password to log in without a text message. Your phone code will keep working.
          </p>
          {canEditEmail ? (
            <LoginSecurityForm email={user.email ?? ""} hasPassword={!!user.passwordHash} />
          ) : (
            <Note tone="amber">Email sign-in is not set up yet. Please try again later.</Note>
          )}
          {emailReady() && user.email && !user.emailVerifiedAt && (
            <form action={resendVerificationEmail} className="mt-3">
              <SubmitButton className="text-sm font-bold text-accent">Send verification email again</SubmitButton>
            </form>
          )}
          {user.emailVerifiedAt && <p className="mt-3 text-xs font-bold text-[#1b6b3a]">Email verified</p>}
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <h2 className="text-[17px] font-extrabold">Google</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {user.googleSubject ? "Google is connected. You can use it to log in." : "Connect Google to log in with one tap."}
          </p>
          {user.googleSubject ? (
            <p className="mt-3 text-sm font-bold text-[#1b6b3a]">Connected</p>
          ) : googleReady() ? (
            <a href="/auth/google?link=1" className="mt-3 flex h-11 items-center justify-center rounded-full border border-line text-sm font-bold">
              Connect Google
            </a>
          ) : (
            <p className="mt-3 text-xs font-semibold text-muted">Google sign-in is not set up yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
