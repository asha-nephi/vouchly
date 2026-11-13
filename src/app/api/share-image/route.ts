import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { isOurPhoto, readPhoto } from "@/lib/photos";

// A listing photo as a 1200×630 JPEG, which every chat app shows in link previews.
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src") ?? "";
  if (!isOurPhoto(src)) return new NextResponse("Not found", { status: 404 });
  let bytes: Buffer | null = null;
  const local = src.match(/^\/api\/photos\/([0-9a-f-]{36})$/);
  if (local) {
    const row = await readPhoto(local[1]);
    bytes = row ? Buffer.from(row.data) : null;
  } else {
    const res = await fetch(src).catch(() => null);
    bytes = res?.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const jpeg = await sharp(bytes).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  return new NextResponse(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
