import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = [
  "/checkout",
  "/profile",
  "/dashboard",
  "/account",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const url = new URL("/auth/login", request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
  }

  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/checkout/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
