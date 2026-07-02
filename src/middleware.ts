import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const CANONICAL_HOST = "www.toolq.online";
const CANONICAL_PROTOCOL = "https";
const DOMAIN_HOSTS = new Set(["toolq.online", CANONICAL_HOST]);

export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");

  if (DOMAIN_HOSTS.has(hostname) && (hostname !== CANONICAL_HOST || protocol !== CANONICAL_PROTOCOL)) {
    const url = request.nextUrl.clone();
    url.protocol = `${CANONICAL_PROTOCOL}:`;
    url.hostname = CANONICAL_HOST;
    return NextResponse.redirect(url, 301);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
