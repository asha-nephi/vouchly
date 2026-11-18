import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { priceText } from "@/lib/listings";
import { myShop } from "@/lib/shops";
import { siteUrl } from "@/lib/site";
import { BackBar, Note } from "@/components/ui";
import type { Params } from "@/components/data/params";
import CollectionForm from "./collection-form";
import { CollectionsDesk } from "./collections-desk";

export const dynamic = "force-dynamic";

// A seller's collections: each has its own link to share.
export default async function Collections({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const sp = await searchParams;
  const { saved, deleted } = sp;
  const [cols, listings] = await Promise.all([
    db.select().from(collections).where(eq(collections.shopId, shop.id)).orderBy(asc(collections.createdAt)),
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
  ]);
  const live = new Set(listings.filter((l) => l.isActive).map((l) => l.id));
  const picks = listings.map((l) => ({ id: l.id, name: l.name, price: priceText(l), off: !l.isActive }));
  const base = `${siteUrl()}/s/${shop.slug}`;
  const rows = cols.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    inIt: c.productIds.filter((id) => listings.some((l) => l.id === id)).length,
    forSale: c.productIds.filter((id) => live.has(id)).length,
    link: `${base}?c=${c.slug}`,
    createdAt: c.createdAt,
  }));

  return (
    <>
      <CollectionsDesk sp={sp} rows={rows} picks={picks} saved={!!saved} deleted={!!deleted} />
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Collections" href="/shop/manage" />
        <div className="flex flex-col gap-4 px-4">
          <Note>Group listings under a name, like &ldquo;Christmas gifts&rdquo; or &ldquo;Saturday meals&rdquo;. Each one has its own link, so you can share just those.</Note>
          {saved && <Note tone="green">Collection saved. Share its link below.</Note>}
          {deleted && <Note tone="green">Collection deleted.</Note>}

          {cols.map((c) => {
            const n = c.productIds.filter((id) => live.has(id)).length;
            const link = `${base}?c=${c.slug}`;
            return (
              <section key={c.id} className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
                <p className="text-[17px] font-extrabold">{c.name}</p>
                <p className="text-[13px] text-muted">
                  {n} {n === 1 ? "listing" : "listings"} for sale
                </p>
                <p className="mt-1 truncate text-[13px] font-semibold text-accent">{link.replace(/^https?:\/\//, "")}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${c.name} from ${shop.name} on Vouchly: ${link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#1F7A46] px-3 text-sm font-extrabold text-white"
                  >
                    Share on WhatsApp
                  </a>
                  <Link href={`/s/${shop.slug}?c=${c.slug}`} className="flex h-11 items-center justify-center rounded-xl border border-line bg-white px-3.5 text-sm font-bold">
                    See it
                  </Link>
                  <Link href={`/shop/manage/collections/${c.id}`} className="flex h-11 items-center justify-center rounded-xl border border-line bg-white px-3.5 text-sm font-bold">
                    Edit
                  </Link>
                </div>
              </section>
            );
          })}

          <h2 className="pt-2 text-[17px] font-extrabold">{cols.length ? "New collection" : "Make your first collection"}</h2>
          <CollectionForm listings={picks} />
        </div>
      </main>
    </>
  );
}
