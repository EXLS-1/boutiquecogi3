import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  try {
    // Récupération de la session BetterAuth
    const session = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    // Routes publiques (non protégées)
    const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/error"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    // Si pas de session et route non publique → redirection login
    if (!session && !isPublic) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Si session présente et route publique "login" ou "register" → rediriger vers dashboard
    if (session && (pathname === "/auth/login" || pathname === "/auth/register")) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Tout va bien, poursuivre
    return NextResponse.next({ request });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};