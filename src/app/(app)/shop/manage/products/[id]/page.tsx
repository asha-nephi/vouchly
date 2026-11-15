import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar, Note } from "@/components/ui";
import SubmitButton from "@/components/submit-button";
import { copyProduct } from "../../../actions";
import ProductForm from "../product-form";
import PostMaker from "@/components/post-maker";
import { MAX_FILE_MB } from "@/lib/files";
import { aiReady } from "@/lib/ai";
import { similarPrices } from "@/lib/ai-writer";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ post?: string; copied?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.removed, false)))
    .limit(1);
  if (!product) notFound();
  const { post, copied } = await searchParams;
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title={copied ? "Edit your copy" : "Edit listing"} href="/shop/manage" />
      {copied && (
        <div className="mx-4 mb-2">
          <Note tone="green">
            Copy made. It&apos;s hidden from buyers for now. Change the name, price, photos or {product.kind === "event" ? "date" : "details"}, turn on &quot;Show in my shop&quot;, then save.
          </Note>
        </div>
      )}
      {product.kind === "event" && (
        <Link href={`/shop/manage/products/${product.id}/attendees`} className="mx-4 mb-2 flex items-center justify-between rounded-[18px] bg-soft px-4 py-3 text-[15px] font-bold text-deep">
          Who&apos;s coming <span aria-hidden="true">→</span>
        </Link>
      )}
      {product.kind === "stay" && (
        <Link href={`/shop/manage/products/${product.id}/calendar`} className="mx-4 mb-2 flex items-center justify-between rounded-[18px] bg-soft px-4 py-3 text-[15px] font-bold text-deep">
          Calendar: block dates <span aria-hidden="true">→</span>
        </Link>
      )}
      {aiReady() && product.isActive && (
        <details id="post" open={post === "1"} className="mx-4 mb-2 scroll-mt-4 rounded-[18px] bg-soft px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-bold text-deep">
            Make a post about this <span aria-hidden="true">›</span>
          </summary>
          <div className="pt-3">
            <PostMaker productId={product.id} />
          </div>
        </details>
      )}
      <ProductForm aiOn={aiReady()} similar={await similarPrices(shop.category)} maxFileMb={MAX_FILE_MB} product={product} />
      {!copied && (
        <form action={copyProduct} className="-mt-6 px-4 pb-8">
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton className="h-[50px] w-full rounded-2xl border border-line bg-white text-[14px] font-bold text-ink">Make a copy of this listing</SubmitButton>
        </form>
      )}
    </main>
  );
}
