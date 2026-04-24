import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROUTES = ["/admin"];
const AUTH_ROUTES = ["/profile", "/orders"];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Non connecté
  if (!token) {
    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${pathname}`, req.url)
      );
    }
    return NextResponse.next();
  }

  // Admin uniquement
  if (
    ADMIN_ROUTES.some(route => pathname.startsWith(route)) &&
    token.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile", "/orders"],
};