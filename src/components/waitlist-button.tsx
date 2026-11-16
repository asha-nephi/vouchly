import Link from "next/link";
import { toggleWaitlist } from "@/app/waitlist-actions";
import SubmitButton from "@/components/submit-button";

// "Sold out" box with a waitlist button. People who aren't logged in are sent to log in.
export default function WaitlistBox({ productId, joined, signedIn, event }: { productId: string; joined: boolean; signedIn: boolean; event?: boolean }) {
  const btn = "flex h-[52px] w-full items-center justify-center rounded-[14px] text-base font-extrabold";
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[18px] bg-[#fbebeb] p-4 text-center">
      <p className="text-[15px] font-bold text-[#5c1a12]">Sold out</p>
      {joined ? (
        <>
          <p className="text-[13px] font-semibold text-[#5c1a12]">You&apos;re on the waitlist. We&apos;ll tell you in your notifications when {event ? "a seat is free" : "it's back"}.</p>
          <form action={toggleWaitlist}>
            <input type="hidden" name="productId" value={productId} />
            <SubmitButton pendingText="…" className="text-[13px] font-bold text-muted underline">
              Leave the waitlist
            </SubmitButton>
          </form>
        </>
      ) : signedIn ? (
        <form action={toggleWaitlist}>
          <input type="hidden" name="productId" value={productId} />
          <SubmitButton pendingText="Adding you…" className={`${btn} bg-ink text-white`}>
            Tell me when {event ? "a seat is free" : "it's back"}
          </SubmitButton>
        </form>
      ) : (
        <Link href="/login" className={`${btn} bg-ink text-white`}>
          Log in to join the waitlist
        </Link>
      )}
    </div>
  );
}
