import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { isOurPhoto, isR2Photo, readPhoto } from "@/lib/photos";
import { allow, clientIp } from "@/lib/rate-limit";

const MAX_BYTES = 5_000_000;

// Reads a photo from R2, but gives up if it's too big or too slow.
async function fetchPhoto(src: string): Promise<Buffer | null> {
  const res = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok || !res.body) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks);
}

// A listing photo as a 1200×630 JPEG, which every chat app shows in link previews.
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src") ?? "";
  if (!isOurPhoto(src)) return new NextResponse("Not found", { status: 404 });
  // Making these pictures is slow work, so each visitor gets a fair share.
  if (!allow(`share:${await clientIp()}`, 60, 60_000)) return new NextResponse("Too many tries.", { status: 429 });
  let bytes: Buffer | null = null;
  const local = src.match(/^\/api\/photos\/([0-9a-f-]{36})$/);
  if (local) {
    const row = await readPhoto(local[1]);
    bytes = row ? Buffer.from(row.data) : null;
  } else if (isR2Photo(src)) {
    bytes = await fetchPhoto(src);
  }
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  try {
    const jpeg = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .timeout({ seconds: 10 })
      .resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
