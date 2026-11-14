import Link from "next/link";
import { BackBar } from "@/components/ui";
import ResetPasswordForm from "./reset-form";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Reset password" href="/login" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{token ? "Choose a new password" : "Forgot your password?"}</h1>
        <p className="text-sm leading-relaxed text-muted">
          {token ? "Use at least 12 characters." : "Enter the email address on your account. We’ll send a reset link if we find it."}
        </p>
        <ResetPasswordForm token={token} />
        <Link href="/login" className="self-center text-sm font-bold text-accent">Back to log in</Link>
      </div>
    </main>
  );
}
