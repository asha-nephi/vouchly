import { NextResponse, type NextRequest } from "next/server";

// Only these pages take big uploads (photos and files), and only for signed-in people.
const UPLOAD_PATHS = ["/sell", "/shop/manage"];
const SMALL = 1_000_000; // 1 MB is plenty for every other form
const BIG = 32 * 1024 * 1024;

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();
  const size = Number(req.headers.get("content-length") ?? 0);
  const path = req.nextUrl.pathname;
  const uploads = UPLOAD_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const limit = uploads && req.cookies.has("vl_session") ? BIG : SMALL;
  if (size > limit) return new NextResponse("That is too big to send.", { status: 413 });
  return NextResponse.next();
}

// Skip files Next serves by itself.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"] };
