import { NextRequest, NextResponse } from "next/server";

export async function handleBetterAuth(request: NextRequest) {
  const token = request.cookies.get("better-auth.session")?.value;

  const pathname = request.nextUrl.pathname;

  const isPublic =
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/api/public");

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Ici tu peux vérifier le token (JWT, DB, etc.)
  // Exemple minimal :
  // const isValid = await verifyToken(token)

  return null; // OK → continue pipeline
}