// proxy.ts
// ============================================
// EDGE AUTH PROXY — Gardien d'entrée léger pour Boutiquecogi3
// ============================================
// Ce proxy est le SEUL point d'entrée Edge pour la sécurité réseau.
// Il est intentionnellement AGNOSTIQUE de la logique métier RBAC.
//
// RESPONSABILITÉS STRICTES :
//   1. Security Headers (universels, toutes les réponses)
//   2. Classification des routes (Public | Auth | Protected | Admin)
//   3. Vérification binaire de session par cookie (Authentifié / GUEST) à 0ms de latence
//   4. Redirects (legacy/typos + préservation des query params + callbackUrl)
//
// DÉLÉGATION EXPLICITE :
//   • Permissions       → @/lib/auth/server.ts (guardPermission, etc.)
//   • Restrictions      → @/lib/auth/rbac.ts (resolveEffectiveRestrictions)
//   • Niveaux RBAC      → @/lib/auth/server.ts (guardMinLevel, guardAdmin)
//   • Audit & Quotas    → @/lib/auth/server.ts (logAudit, enforceQuota)
//   • Gestion des rôles → @/lib/auth/rbac.ts (normalizeRole, getRoleLevel)
//
// RÈGLE D'OR :
//   Le proxy ne connaît que deux états : "a une session" ou "GUEST".
//   Toute granularité (Level 1-7) est résolue en aval dans les
//   Server Components et Server Actions.

import { NextResponse, type NextRequest } from "next/server";

// ═══════════════════════════════════════════
// SECTION 1: CONFIGURATION
// ═══════════════════════════════════════════

/** Headers de sécurité appliqués à TOUTES les réponses */
const SECURITY_HEADERS = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), vr=(), magnetometer=(), gyroscope=()",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
} as const;

/** Routes d'authentification (pages de login/register/recovery/2FA) */
const AUTH_ROUTES = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forget-password",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/two-factor",
  "/auth/2fa-challenge",
  "/auth/callback",
];

/** Routes protégées (nécessitent une session authentifiée) */
const PROTECTED_ROUTES = [
  "/checkout",
  "/profile",
  "/account",
  "/orders",
  "/wishlist",
];

/** Routes admin (nécessitent une session ; le RBAC détaillé est en aval) */
const ADMIN_ROUTES = [
  "/super_admin",
  "/super_admin/dashboard",
  "/super_admin/users",
  "/super_admin/roles",
  "/super_admin/settings",
  "/super_admin/analytics",
  "/super_admin/setup-2fa",
  "/super_admin/security",
  "/super_admin/verify-2fa",
  "/dashboard",
];

// ═══════════════════════════════════════════
// SECTION 2: UTILITAIRES
// ═══════════════════════════════════════════

/** Détermine la zone de sécurité d'un pathname */
function classifyRoute(pathname: string): "public" | "auth" | "protected" | "admin" {
  // Auth routes
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "auth";
  }

  // Admin routes
  if (ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "admin";
  }

  // Protected routes
  if (PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "protected";
  }

  // Par défaut : public (le downstream RBAC protège les API et pages sensibles)
  return "public";
}

/** Vérification binaire de session ultra-rapide par cookie (0ms latency, Edge-safe) */
function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token") ||
    request.cookies.has("better_auth.session_token") ||
    request.cookies.has("better-auth.session_data") ||
    request.cookies.has("__Secure-better-auth.session_data")
  );
}

/** Construit une URL de redirection vers auth avec callbackUrl */
function buildAuthRedirect(request: NextRequest, path: string): URL {
  const url = new URL(path, request.nextUrl.origin);
  // Préservation des query params existants (sauf callbackUrl)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "callbackUrl") {
      url.searchParams.set(key, value);
    }
  });
  // Injection du callbackUrl si la route actuelle n'est pas une route auth
  const currentPath = request.nextUrl.pathname;
  if (!currentPath.startsWith("/auth")) {
    url.searchParams.set("callbackUrl", currentPath);
  }
  return url;
}

// ═══════════════════════════════════════════
// SECTION 3: PROXY PRINCIPAL
// ═══════════════════════════════════════════

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Phase 0: Injection du pathname pour les Server Components en aval ───
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // ─── Phase 1: Security Headers (toujours appliqués) ───
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // ─── Phase 2: Redirects legacy & typos ───
  if (
    pathname === "/sign-in" ||
    pathname === "/login" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signin"
  ) {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-in"));
  }
  if (
    pathname === "/sign-up" ||
    pathname === "/register" ||
    pathname === "/auth/signup"
  ) {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-up"));
  }

  // ─── Phase 3: Classification de la route ───
  const zone = classifyRoute(pathname);

  if (zone === "public") {
    return response;
  }

  // ─── Phase 4: Résolution binaire rapide de la session (0ms network) ───
  const isAuthenticated = hasSessionCookie(request);

  // ─── Phase 5: Auth Zone ───
  if (zone === "auth" && isAuthenticated) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const redirectTarget =
      callbackUrl && !callbackUrl.startsWith("/auth") ? callbackUrl : "/profile";
    return NextResponse.redirect(new URL(redirectTarget, request.nextUrl.origin));
  }

  // ─── Phase 6: Protected & Admin Zones ───
  if ((zone === "protected" || zone === "admin") && !isAuthenticated) {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-in"));
  }

  // ─── Phase 7: Pass-through ───
  return response;
}

// ═══════════════════════════════════════════
// SECTION 4: MATCHER
// ═══════════════════════════════════════════
// Exclusion stricte des routes API et des assets statiques pour la performance.
// ═══════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled directly by Route Handlers with RBAC)
     * - _next/static (Next.js static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json
     * - Static assets: svg, png, jpg, jpeg, gif, webp, ico, css, js, fonts
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
