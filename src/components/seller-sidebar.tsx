import { currentUser } from "@/lib/auth";
import { Suspense } from "react";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { initials, toneFor } from "@/lib/initials";
import { sellerNext, TO_DO } from "@/lib/order-status";
import type { SellerType } from "@/lib/seller-types";
import { SideLinks, type SideItem } from "@/components/side-nav";
import { DensitySwitch } from "@/components/data/density-switch";
import { getDensity } from "@/components/data/density";

const PATH_NAME: Record<SellerType, string> = { service: "Service pro", online: "Online seller", products: "Product seller" };

// How many orders wait on the seller, and how many of those are price requests.
export async function waitingCounts(shopId: string) {
  const rows = await db
    .select({ status: orders.status, method: orders.method })
    .from(orders)
    .where(and(eq(orders.shopId, shopId), inArray(orders.status, [...TO_DO])));
  const requests = rows.filter((r) => r.status === "requested").length;
  const other = rows.filter((r) => r.status !== "requested" && (r.status === "disputed" || sellerNext(r.status, r.method))).length;
  return { requests, other, all: requests + other };
}

// The menu a seller sees first depends on the path they picked.
function menu(type: SellerType, c: { requests: number; other: number; all: number }): SideItem[] {
  const tail: SideItem[] = [
    { href: "/shop/manage/collections", label: "Collections" },
    { href: "/shop/manage/discounts", label: "Discounts" },
    { href: "/shop/manage/payout", label: "Payout account" },
    { href: "/shop/manage/edit", label: "Shop settings" },
  ];
  if (type === "service")
    return [
      { href: "/shop/manage", label: "Overview" },
      { href: "/shop/manage/orders?show=requests", label: "Requests", count: c.requests },
      { href: "/shop/manage/orders", label: "Bookings", count: c.other },
      { href: "/shop/manage#listings", label: "My services" },
      { href: "/shop/manage/sales", label: "Sales" },
      ...tail,
    ];
  if (type === "online")
    return [
      { href: "/shop/manage", label: "Overview" },
      { href: "/shop/manage/sales", label: "Sales" },
      { href: "/shop/manage/orders", label: "Sessions and tickets", count: c.all },
      { href: "/shop/manage#listings", label: "Classes and downloads" },
      ...tail,
    ];
  return [
    { href: "/shop/manage", label: "Overview" },
    { href: "/shop/manage/orders", label: "Orders", count: c.all },
    { href: "/shop/manage/delivery", label: "Delivery days" },
    { href: "/shop/manage#listings", label: "Products" },
    { href: "/shop/manage/sales", label: "Sales" },
    ...tail,
  ];
}

// The navy left sidebar for sellers and admins on computers. Phones never see it.
export function SideShell({ card, items, foot, tools, children }: { card: React.ReactNode; items: SideItem[]; foot: SideItem[]; tools?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col gap-1 overflow-y-auto bg-ink px-3.5 py-5 text-white lg:flex print:hidden">
        <Link href="/home" className="px-2.5 pb-[18px] pt-1 text-[22px] font-extrabold tracking-[-0.02em] text-white">
          Vouchly
        </Link>
        <div className="mb-3.5">{card}</div>
        <Suspense>
          <SideLinks items={items} />
        </Suspense>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/12 pt-[18px]">
          {tools && <div className="px-1 pb-2">{tools}</div>}
          {foot.map((f) => (
            <Link key={f.href} href={f.href} className="flex h-10 items-center rounded-[10px] px-3 text-sm font-bold text-[#C9D3EE] hover:bg-white/6 hover:text-white">
              {f.label}
            </Link>
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default async function SellerSidebar({ shop, children }: { shop: { id: string; name: string; slug: string; isOpen: boolean; sellerType: SellerType }; children: React.ReactNode }) {
  const [counts, me, density] = await Promise.all([waitingCounts(shop.id), currentUser(), getDensity("seller")]);
  const card = (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-white/8 p-3">
      <span className="grid size-[38px] shrink-0 place-items-center rounded-[11px] text-sm font-extrabold" style={{ background: toneFor(shop.name) }} aria-hidden="true">
        {initials(shop.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold">{shop.name}</span>
        <span className="block text-xs font-bold text-[#AFC0F5]">
          {PATH_NAME[shop.sellerType]} · {!me?.confirmed ? "Hidden for now" : shop.isOpen ? "Open" : "Closed"}
        </span>
      </span>
    </div>
  );
  return (
    <SideShell
      card={card}
      items={menu(shop.sellerType, counts)}
      foot={[
        { href: `/s/${shop.slug}`, label: "View my page" },
        { href: "/home", label: "Switch to buying" },
      ]}
      tools={
        <>
          <p className="px-1.5 pb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#AFC0F5]">Table size</p>
          <DensitySwitch value={density} dark />
        </>
      }
    >
      {children}
    </SideShell>
  );
}
