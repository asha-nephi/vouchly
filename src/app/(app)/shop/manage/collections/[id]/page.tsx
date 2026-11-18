import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { aiReady } from "@/lib/ai";
import { priceText } from "@/lib/listings";
import { myShop } from "@/lib/shops";
import { siteUrl } from "@/lib/site";
import SubmitButton from "@/components/submit-button";
import { BackBar } from "@/components/ui";
import CopyButton from "@/components/data/copy-button";
import { SidePanel } from "@/components/data/side-panel";
import { hrefWith, type Params } from "@/components/data/params";
import { ListingsDesk } from "../../listings/listings-desk";
import CollectionForm from "../collection-form";
import { deleteCollection } from "../actions";

export const dynamic = "force-dynamic";

const btn = "inline-flex h-10 items-center rounded-xl border border-line bg-white px-3.5 text-sm font-bold";

// One collection. Computers: its listings in a table, with Remove from collection. Phones: the edit form.
export default async function EditCollection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [[c], listings] = await Promise.all([
    db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.shopId, shop.id)))
      .limit(1),
    db
      .select()
      .from(products)
      .where(and(eq(products.shopId, shop.id), eq(products.removed, false)))
      .orderBy(asc(products.createdAt)),
  ]);
  if (!c) notFound();
  const picks = listings.map((l) => ({ id: l.id, name: l.name, price: priceText(l), off: !l.isActive }));
  const path = `/shop/manage/collections/${c.id}`;
  const link = `${siteUrl()}/s/${shop.slug}?c=${c.slug}`;

  const form = (
    <>
      <CollectionForm id={c.id} name={c.name} picked={c.productIds} listings={picks} />
      <p className="text-[13px] text-muted">The link stays the same if you change the name, so links you shared keep working.</p>
      <form action={deleteCollection} className="flex justify-center">
        <input type="hidden" name="id" value={c.id} />
        <SubmitButton pendingText="Deleting…" className="h-11 px-4 text-sm font-bold text-[#b42318]">
          Delete this collection
        </SubmitButton>
      </form>
    </>
  );

  return (
    <>
      <ListingsDesk
        shopId={shop.id}
        sp={sp}
        ai={aiReady()}
        title={c.name}
        collection={{ id: c.id, path }}
        head={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/shop/manage/collections" className="mr-1 text-sm font-bold text-muted hover:text-ink">
              ← All collections
            </Link>
            <CopyButton text={link} label={`Copy link for ${c.name}`} big />
            <a href={`https://wa.me/?text=${encodeURIComponent(`${c.name} from ${shop.name} on Vouchly: ${link}`)}`} target="_blank" rel="noreferrer" className={btn}>
              Share on WhatsApp
            </a>
            <Link href={`/s/${shop.slug}?c=${c.slug}`} className={btn}>
              See it
            </Link>
            <Link href={hrefWith(path, sp, { open: "edit" })} scroll={false} className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-white">
              Edit name and listings
            </Link>
          </div>
        }
        panel={
          sp.open === "edit" && (
            <SidePanel title="Edit collection" sub={link.replace(/^https?:\/\//, "")} closeHref={hrefWith(path, sp, { open: null })}>
              <div className="-mx-5 -my-4 flex flex-col gap-3 bg-bg px-4 py-4">{form}</div>
            </SidePanel>
          )
        }
      />
      <main className="mx-auto min-h-dvh max-w-md pb-10 lg:hidden">
        <BackBar title="Edit collection" href="/shop/manage/collections" />
        <div className="flex flex-col gap-4 px-4">{form}</div>
      </main>
    </>
  );
}
