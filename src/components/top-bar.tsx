import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { basketCount, readBasket } from "@/lib/basket";
import { unreadCount } from "@/lib/notifications";
import { initials } from "@/lib/initials";
import Bell from "@/components/bell";
import { AREAS } from "@/lib/catalog";
import { AreaMenu, HideOn, SectionTabs, TopSearch } from "@/components/section-nav";

// The computer top bar. Phones never see it; they keep the bottom tabs.
export default async function TopBar() {
  const [user, basket] = await Promise.all([currentUser(), readBasket()]);
  const member = user && !user.isGuest ? user : null;
  const count = basketCount(basket);
  const unread = member ? await unreadCount(member.id) : 0;

  return (
    <Suspense>
      <HideOn prefixes={["/shop/manage", "/admin"]}>
        <header className="sticky top-0 z-30 hidden border-b border-line bg-white lg:block">
          <div className="mx-auto flex max-w-[1280px] items-center gap-5 px-6 py-3">
            <Link href={member ? "/home" : "/"} className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
              Vouchly
            </Link>
            <TopSearch />
            {!member && <AreaMenu areas={AREAS} />}
            {member && (
              <Link href="/area" className="flex h-[46px] items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-sm font-bold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                {member.area ?? "Ikeja"}
                <span className="sr-only">, change area</span>
              </Link>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <Link href={member ? "/sell" : "/join"} className="px-2.5 text-sm font-bold text-accent">
                Sell on Vouchly
              </Link>
              <Link href="/basket" aria-label={count ? `Basket, ${count} ${count === 1 ? "item" : "items"}` : "Basket"} className="relative grid size-11 place-items-center rounded-xl hover:bg-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14213D" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0" />
                </svg>
                {count > 0 && <span className="absolute right-[3px] top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-[5px] text-[11px] font-extrabold text-white">{count}</span>}
              </Link>
              {member ? (
                <>
                  <Bell initial={unread} flat />
                  <Link href="/me" aria-label="Your account" className="ml-1 grid size-10 place-items-center rounded-full bg-soft text-sm font-extrabold text-deep">
                    {initials(member.name)}
                  </Link>
                </>
              ) : (
                <>
                  {user?.isGuest && (
                    <Link href="/orders" className="px-2.5 text-sm font-bold text-ink">
                      My orders
                    </Link>
                  )}
                  <Link href="/login" className="ml-1 flex h-11 items-center rounded-xl border border-[#D5DAE3] px-4 text-sm font-bold text-ink">
                    Log in
                  </Link>
                  <Link href="/join" className="flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-extrabold text-white">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
          <SectionTabs />
        </header>
      </HideOn>
    </Suspense>
  );
}
