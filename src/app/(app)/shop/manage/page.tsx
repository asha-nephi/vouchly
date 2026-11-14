import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverySettings, orders, payments, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { categoryLabel, cutoffLabel, dayList, naira } from "@/lib/catalog";
import { myShop } from "@/lib/shops";
import { toggleShopOpen } from "../actions";
import { Note } from "@/components/ui";
import Photo from "@/components/photo";
import { listingLine, priceText } from "@/lib/listings";
import SubmitButton from "@/components/submit-button";
import { initials, toneFor } from "@/lib/initials";

export const dynamic = "force-dynamic";

const card = "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]";

export default async function MyShop({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { saved } = await searchParams;

  const [items, [delivery], counts, [week]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
    db
      .select()
      .from(deliverySettings)
      .where(eq(deliverySettings.shopId, shop.id))
      .limit(1),
    db
      .select({ status: orders.status, n: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shop.id),
          inArray(orders.status, [
            "paid",
            "confirmed",
            "preparing",
            "ready",
            "on_the_way",
            "disputed",
            "requested",
            "quoted",
          ]),
        ),
      )
      .groupBy(orders.status),
    db
      .select({ earned: sql<number>`coalesce(sum(${payments.sellerKobo}), 0)::int`, sales: sql<number>`count(*)::int` })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(eq(orders.shopId, shop.id), inArray(payments.status, ["held", "released"]), gte(payments.createdAt, new Date(Date.now() - 7 * 86400_000)))),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const open = counts.reduce((a, c) => a + c.n, 0);

  const ways = delivery
    ? [
        delivery.pickupOn && "Pickup",
        delivery.dropOffOn && "Drop-off",
        delivery.riderOn && "Rider",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Not set";
  const days = delivery ? dayList(delivery.deliveryDays) : "";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <div className="flex flex-col gap-4 px-4 pt-5">
        <div className="flex items-center justify-between">
          <Link href="/home" className="text-[13px] font-bold text-muted">
            ← Home
          </Link>
          <Link
            href={`/s/${shop.slug}`}
            className="text-[13px] font-bold text-accent"
          >
            View as buyer
          </Link>
        </div>
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">My shop</h1>
          <p className="mt-0.5 text-sm font-semibold text-muted">{shop.name}</p>
        </div>

        {saved === "product" && <Note tone="green">Saved.</Note>}
        {saved === "removed" && <Note tone="green">Removed.</Note>}

        <section className={`${card} flex items-center gap-3 p-3`}>
          <div className="relative grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-soft">
            {shop.coverPhoto ? (
              <Photo src={shop.coverPhoto} sizes="52px" />
            ) : (
              <span className="grid size-full place-items-center text-sm font-extrabold text-white" style={{ background: toneFor(shop.name) }}>
                {initials(shop.name)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold">{shop.name}</p>
            <p
              className={`text-xs font-semibold ${shop.isOpen ? "text-[#1b6b3a]" : "text-muted"}`}
            >
              {shop.isOpen ? "Open for orders" : "Closed — buyers can't order"}{" "}
              · {categoryLabel(shop.category)}
            </p>
          </div>
          <form action={toggleShopOpen}>
            <SubmitButton pendingText="…" className="h-9 rounded-full border border-[#d5dae4] px-3 text-xs font-bold">
              {shop.isOpen ? "Close" : "Open"}
            </SubmitButton>
          </form>
        </section>

        <Link href="/shop/manage/sales" className={`${card} flex items-center gap-3 p-4`}>
          <span className="flex-1">
            <span className="block text-[13px] font-bold text-muted">Earned this week</span>
            <span className="block text-[22px] font-extrabold tracking-tight">{naira(week?.earned ?? 0)}</span>
            <span className="block text-[13px] text-muted">
              {week?.sales ?? 0} {week?.sales === 1 ? "sale" : "sales"}. See sales, top sellers and payouts
            </span>
          </span>
          <span className="text-accent" aria-hidden="true">
            →
          </span>
        </Link>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              href: "/shop/manage/products/new",
              label: "Add listing",
              icon: "M12 5v14M5 12h14",
            },
            {
              href: "/shop/manage/sales",
              label: "Sales",
              icon: "M4 20V10M10 20V4M16 20v-7M22 20H2",
            },
            {
              href: "/shop/manage/discounts",
              label: "Discounts",
              icon: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
            },
            {
              href: "/shop/manage/edit",
              label: "Edit shop",
              icon: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
            },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`${card} flex min-h-24 flex-col items-center justify-center gap-1.5 px-2 py-3.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-soft text-deep">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={a.icon} />
                </svg>
              </span>
              <span className="text-xs font-bold leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/shop/manage/orders"
          className="flex items-center gap-3 rounded-[20px] bg-ink p-4 text-white"
        >
          <span className="flex-1">
            <span className="block text-base font-extrabold">Orders</span>
            <span className="mt-0.5 block text-[13px] text-[#c9d1e3]">
              {open === 0
                ? "No open orders"
                : [
                    n("paid") && `${n("paid")} new`,
                    n("requested") && `${n("requested")} need${n("requested") === 1 ? "s" : ""} a price`,
                    n("disputed") && `${n("disputed")} with a problem`,
                    `${open} open`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </span>
          </span>
          {n("paid") + n("disputed") + n("requested") > 0 && (
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-ink">
              {n("paid") + n("disputed") + n("requested")}
            </span>
          )}
          <span aria-hidden="true">→</span>
        </Link>

        <Link
          href="/shop/manage/payout"
          className={
            shop.paystackSubaccount
              ? `${card} block p-4`
              : "block rounded-[20px] bg-[#fdf0d5] p-4 text-[#3a2a08]"
          }
        >
          <p className="text-[13px] font-bold opacity-70">Payout account</p>
          {shop.paystackSubaccount ? (
            <p className="mt-1 text-[15px] font-bold">
              {shop.payoutBank} · ···· {shop.payoutAccountLast4}
            </p>
          ) : (
            <p className="mt-1 text-[15px] font-bold">
              Add your bank account so buyers can pay you →
            </p>
          )}
        </Link>

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
          <h2 className="text-base font-extrabold">
            {items.every((i) => i.kind === "item") ? "Products" : "Listings"} ({items.length})
          </h2>
          <Link
            href="/shop/manage/products/new"
            className="text-[13px] font-bold text-accent"
          >
            + Add
          </Link>
        </div>

        {items.length === 0 ? (
          <Link
            href="/shop/manage/products/new"
            className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-6 text-center"
          >
            <p className="text-[15px] font-bold">Add your first product</p>
            <p className="mt-1 text-[13px] text-muted">
              A photo, a name and a price is all it takes.
            </p>
          </Link>
        ) : (
          <div className="cards">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/shop/manage/products/${p.id}`}
                className={`${card} flex items-center gap-3 p-3`}
              >
                <div className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-chip">
                  {p.photos[0] && <Photo src={p.photos[0]} sizes="60px" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{p.name}</p>
                  <p className="text-[13px] text-muted">
                    {listingLine(p)}
                  </p>
                  <p className="text-sm font-extrabold">{priceText(p)}</p>
                </div>
                {!p.isActive && (
                  <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-[#3a4458]">
                    Hidden
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
