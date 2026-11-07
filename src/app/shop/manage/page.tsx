import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { categoryLabel, cutoffLabel, DAYS, naira } from "@/lib/catalog";
import { myShop } from "@/lib/shops";
import { toggleShopOpen } from "../actions";
import { Note } from "@/components/ui";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

export default async function MyShop({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { saved } = await searchParams;

  const [items, [delivery]] = await Promise.all([
    db.select().from(products).where(and(eq(products.shopId, shop.id), eq(products.removed, false))).orderBy(asc(products.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.shopId, shop.id)).limit(1),
  ]);

  const ways = delivery
    ? [delivery.pickupOn && "Pickup", delivery.dropOffOn && "Drop-off", delivery.riderOn && "Rider"].filter(Boolean).join(" · ")
    : "Not set";
  const days = delivery ? delivery.deliveryDays.map((d) => DAYS[d]).join(", ") : "";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <div className="flex flex-col gap-4 px-4 pt-5">
        <div className="flex items-center justify-between">
          <Link href="/home" className="text-[13px] font-bold text-muted">
            ← Home
          </Link>
          <Link href={`/s/${shop.slug}`} className="text-[13px] font-bold text-accent">
            View as buyer
          </Link>
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight">My shop</h1>

        {saved === "product" && <Note tone="green">Product saved.</Note>}
        {saved === "removed" && <Note tone="green">Product removed.</Note>}

        <section className={`${card} flex items-center gap-3 p-3`}>
          <div className="size-[52px] shrink-0 overflow-hidden rounded-[14px] bg-soft">
            {shop.coverPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.coverPhoto} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold">{shop.name}</p>
            <p className={`text-xs font-semibold ${shop.isOpen ? "text-[#1b6b3a]" : "text-muted"}`}>
              {shop.isOpen ? "Open for orders" : "Closed — buyers can't order"} · {categoryLabel(shop.category)}
            </p>
          </div>
          <form action={toggleShopOpen}>
            <button type="submit" className="h-9 rounded-full border border-[#d5dae4] px-3 text-xs font-bold">
              {shop.isOpen ? "Close" : "Open"}
            </button>
          </form>
        </section>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href: "/shop/manage/products/new", label: "Add product", icon: "M12 5v14M5 12h14" },
            { href: "/shop/manage/delivery", label: "Delivery", icon: "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM7 17H3V6h11v11M14 9h4l3 4v4h-2" },
            { href: "/shop/manage/edit", label: "Edit shop", icon: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`${card} flex flex-col items-center gap-1.5 py-3.5`}>
              <span className="flex size-10 items-center justify-center rounded-xl bg-soft text-deep">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={a.icon} />
                </svg>
              </span>
              <span className="text-[13px] font-bold">{a.label}</span>
            </Link>
          ))}
        </div>

        <Link href="/shop/manage/delivery" className={`${card} block p-4`}>
          <p className="text-[13px] font-bold text-muted">Delivery</p>
          <p className="mt-1 text-[15px] font-bold">{ways}</p>
          {delivery && (
            <p className="mt-0.5 text-[13px] text-muted">
              {days} · orders close {cutoffLabel(delivery.orderCutoff)}
            </p>
          )}
        </Link>

        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-extrabold">Products ({items.length})</h2>
          <Link href="/shop/manage/products/new" className="text-[13px] font-bold text-accent">
            + Add
          </Link>
        </div>

        {items.length === 0 ? (
          <Link href="/shop/manage/products/new" className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center">
            <p className="text-[15px] font-bold">Add your first product</p>
            <p className="mt-1 text-[13px] text-muted">A photo, a name and a price is all it takes.</p>
          </Link>
        ) : (
          items.map((p) => (
            <Link key={p.id} href={`/shop/manage/products/${p.id}`} className={`${card} flex items-center gap-3 p-3`}>
              <div className="size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
                {p.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{p.name}</p>
                <p className="text-[13px] text-muted">
                  {[p.size, p.sellMode === "preorder" ? "Pre-order" : "In stock"].filter(Boolean).join(" · ")}
                </p>
                <p className="text-sm font-extrabold">{naira(p.priceKobo)}</p>
              </div>
              {!p.isActive && <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">Hidden</span>}
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
