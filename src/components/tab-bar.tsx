import Link from "next/link";
import { basketCount, readBasket } from "@/lib/basket";
import { currentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";

const TABS = [
  { href: "/home", label: "Home", icon: "M3 11l9-7 9 7M5 10v10h14V10" },
  { href: "/search", label: "Search", icon: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" },
  { href: "/basket", label: "Basket", icon: "M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0" },
  { href: "/me", label: "Me", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
] as const;

// Bottom navigation, fixed to the screen. Pages using it add bottom padding.
export default async function TabBar({ active }: { active: (typeof TABS)[number]["label"] }) {
  const [basket, user] = await Promise.all([readBasket(), currentUser()]);
  const count = basketCount(basket);
  const unread = user ? await unreadCount(user.id) : 0;
  if (!user || user.isGuest) return <GuestBar active={active} count={count} unread={unread} guest={!!user} />;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-2.5 pt-2">
        {TABS.map((t) => {
          const on = t.label === active;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-0.5">
              <span className={`relative flex h-[30px] w-[52px] items-center justify-center rounded-full ${on ? "bg-soft" : ""}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? "#14213d" : "#5a6478"} strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.icon} />
                </svg>
                {t.label === "Me" && unread > 0 && (
                  <span className="absolute right-2.5 top-0.5 size-2.5 rounded-full bg-[#d92d20] ring-2 ring-white">
                    <span className="sr-only">New notifications</span>
                  </span>
                )}
                {t.label === "Basket" && count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-white">
                    {count}
                    <span className="sr-only"> items</span>
                  </span>
                )}
              </span>
              <span className={`text-[11px] ${on ? "font-extrabold text-ink" : "font-semibold text-muted"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const GUEST_TABS = [
  { href: "/", label: "Vouchly", icon: "M5 12.5l4.5 4.5L19 7.5" },
  { href: "/basket", label: "Basket", icon: "M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0" },
  { href: "/orders", label: "My orders", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" },
] as const;

// For people buying through a shared link without an account.
function GuestBar({ active, count, unread, guest }: { active: string; count: number; unread: number; guest: boolean }) {
  const tabs = GUEST_TABS.filter((t) => guest || t.href !== "/orders");
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 px-2 pb-2.5 pt-2">
        {tabs.map((t) => {
          const on = t.label === active || (t.href === "/orders" && active === "Me");
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="flex flex-1 flex-col items-center gap-0.5">
              <span className={`relative flex h-[30px] w-[52px] items-center justify-center rounded-full ${on ? "bg-soft" : ""}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? "#14213d" : "#5a6478"} strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.icon} />
                </svg>
                {t.href === "/orders" && unread > 0 && (
                  <span className="absolute right-2.5 top-0.5 size-2.5 rounded-full bg-[#d92d20] ring-2 ring-white">
                    <span className="sr-only">New notifications</span>
                  </span>
                )}
                {t.label === "Basket" && count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-white">
                    {count}
                    <span className="sr-only"> items</span>
                  </span>
                )}
              </span>
              <span className={`text-[11px] ${on ? "font-bold text-ink" : "font-semibold text-muted"}`}>{t.label}</span>
            </Link>
          );
        })}
        <Link href="/join" className="ml-1 flex h-11 shrink-0 items-center rounded-full bg-ink px-4 text-sm font-bold text-white">
          Join Vouchly
        </Link>
      </div>
    </nav>
  );
}
