import Link from "next/link";
import { toggleSavedShop } from "@/app/saved-actions";

const heart = (filled: boolean) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#2A4BD7" : "none"} stroke={filled ? "#2A4BD7" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

// Heart button on a shop page. Visitors who aren't logged in are sent to log in.
export default function SaveShop({ shopId, saved, signedIn, className }: { shopId: string; saved: boolean; signedIn: boolean; className: string }) {
  if (!signedIn)
    return (
      <Link href="/login" aria-label="Log in to save this shop" className={className}>
        {heart(false)}
      </Link>
    );
  return (
    <form action={toggleSavedShop}>
      <input type="hidden" name="shopId" value={shopId} />
      <button type="submit" aria-label={saved ? "Saved. Tap to remove from your shops" : "Save this shop"} aria-pressed={saved} className={className}>
        {heart(saved)}
      </button>
    </form>
  );
}
