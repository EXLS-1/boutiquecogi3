import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes protégées qui nécessitent une authentification
const protectedRoutes = ["/protected", "/profile", "/cart", "/checkout"];

// Routes admin qui nécessitent un rôle admin
const adminRoutes = ["/admin"];

// Routes publiques accessibles à tous
const publicRoutes = ["/login", "/auth/sign-up", "/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Récupérer le cookie de session BetterAuth
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  
  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = !!sessionToken;
  
  // Récupérer le rôle depuis le cookie (si disponible)
  const userRole = request.cookies.get("better-auth.user.role")?.value || "USER";
  
  // Routes protégées : rediriger vers login si non authentifié
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Routes admin : vérifier le rôle admin
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  
  // Si l'utilisateur est authentifié et essaie d'accéder à login, rediriger vers protected
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/protected", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};