import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, shops } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { readFile } from "@/lib/files";

// Sends a digital product's file, only to the buyer who paid (or the seller).
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.SITE_URL ?? req.nextUrl.origin));
  const { code } = await params;
  const [row] = await db
    .select({ order: orders, fileId: products.fileId, ownerId: shops.ownerId })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.code, code), eq(orders.method, "download")))
    .limit(1);
  const allowed = row && (row.order.buyerId === user.id || row.ownerId === user.id) && ["received", "disputed"].includes(row.order.status);
  if (!row || !allowed || !row.fileId) return new NextResponse("This download isn't available.", { status: 404 });
  const file = await readFile(row.fileId);
  if (!file) return new NextResponse("This file is missing. Please contact the seller.", { status: 404 });
  if (row.order.buyerId === user.id) await db.update(orders).set({ downloads: sql`${orders.downloads} + 1` }).where(eq(orders.id, row.order.id));
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
