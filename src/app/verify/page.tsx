import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { maskPhone } from "@/lib/phone";
import { resendCode } from "../actions";
import { BackBar, Note } from "@/components/ui";
import CodeForm from "./code-form";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function Verify({ searchParams }: { searchParams: Promise<{ e?: string; sent?: string }> }) {
  const jar = await cookies();
  const phone = jar.get("vl_pending_phone")?.value;
  if (!phone) redirect("/");
  const testCode = jar.get("vl_test_code")?.value;
  const { e, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Verify your phone" href="/" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
        <span className="w-fit rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">Step 2 of 2</span>
        <h2 className="text-[22px] font-extrabold tracking-tight">Enter the 6-digit code</h2>
        <p className="text-sm text-muted">We sent it by SMS to {maskPhone(phone)}.</p>
        {testCode && (
          <Note tone="amber">
            <b>Test mode:</b> no SMS was sent. Your code is <b className="tracking-widest">{testCode}</b>
          </Note>
        )}
        {sent && !e && <Note tone="green">A new code is on its way.</Note>}
        <CodeForm initialError={e} />
        <form action={resendCode} className="text-sm">
          <span className="text-muted">Didn&apos;t get it? </span>
          <SubmitButton className="font-bold text-accent">
            Send a new code
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
