import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { aiReady } from "@/lib/ai";
import { priceText } from "@/lib/listings";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import TilePhoto from "@/components/tile-photo";
import type { Params } from "@/components/data/params";
import { ListingsDesk } from "./listings-desk";

export const dynamic = "force-dynamic";

export default async function Listings({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const sp = await searchParams;
  const title = shop.sellerType === "service" ? "My services" : "Listings";
  // Phones: a plain list, like the one on My shop.
  const items = await db.select().from(products).where(and(eq(products.shopId, shop.id), eq(products.removed, false))).orderBy(asc(products.createdAt));

  return (
    <>
      <ListingsDesk shopId={shop.id} sp={sp} ai={aiReady()} title={title} />
      <main className="mx-auto min-h-dvh max-w-md pb-16 lg:hidden">
        <BackBar href="/shop/manage" title={title} />
        <div className="flex flex-col gap-2.5 px-4 pt-2">
          <Link href="/shop/manage/products/new" className="flex h-12 items-center justify-center rounded-xl bg-accent text-[15px] font-extrabold text-white">
            + Add a listing
          </Link>
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted">No listings yet.</p>}
          {items.map((p) => (
            <Link key={p.id} href={`/shop/manage/products/${p.id}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-2.5">
              <span className="shimmer relative size-[52px] shrink-0 overflow-hidden rounded-xl">
                <TilePhoto src={p.photos[0]} name={p.name} sizes="52px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-muted">
                  {!p.isActive ? "Hidden from buyers" : p.kind === "item" && p.stock !== null ? (p.stock === 0 ? "Sold out" : `${p.stock} left`) : "Shown to buyers"}
                </span>
              </span>
              <span className="shrink-0 text-sm font-extrabold tabular-nums">{priceText(p).replace(/ (a night|a session|per .*)$/, "").replace("Price after a chat", "Quote")}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
