import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleClient, googleReady } from "@/lib/google";

const STATE_COOKIE = "vl_google_state";

export async function GET(request: Request) {
  if (!googleReady()) return NextResponse.redirect(new URL("/login?google=unavailable", request.url));
  const link = new URL(request.url).searchParams.get("link") === "1";
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set(STATE_COOKIE, `${state}.${nonce}.${link ? "link" : "login"}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const url = googleClient().generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
    nonce,
  });
  return NextResponse.redirect(url);
}
