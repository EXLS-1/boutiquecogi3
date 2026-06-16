// middleware.ts
// Protection globale des routes dashboard avec RBAC
// HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// maxLevel = niveau MAXIMUM autorisé (plus petit = plus haut)
const DASHBOARD_ROUTES: Record<string, number> = {
  // Level 1 : Super Admin uniquement
  "/dashboard/settings/system": 1,

  // Level 2 : Admin et Super Admin
  "/dashboard/users": 2,
  "/dashboard/users/new": 2,
  "/dashboard/users/roles": 2,
  "/dashboard/users/bans": 2,
  "/dashboard/audit": 2,
  "/dashboard/promotions": 2,
  "/dashboard/promotions/coupons": 2,

  // Level 3 : Manager, Admin, Super Admin
  "/dashboard/analytics": 3,
  "/dashboard/analytics/export": 3,
  "/dashboard/treasury": 3,
  "/dashboard/treasury/transactions": 3,
  "/dashboard/treasury/refunds": 3,
  "/dashboard/treasury/cinetpay": 3,
  "/dashboard/payments": 3,
  "/dashboard/checkout": 3,

  // Level 4 : Moderator et au-dessus
  "/dashboard/orders/all": 4,
  "/dashboard/categories": 4,
  "/dashboard/categories/reorder": 4,
  "/dashboard/videos": 4,

  // Level 5 : Seller et au-dessus
  "/dashboard/products": 5,
  "/dashboard/products/new": 5,
  "/dashboard/products/variants": 5,
  "/dashboard/products/reviews": 5,
  "/dashboard/media": 5,
  "/dashboard/media/upload": 5,

  // Level 6 : Tous les utilisateurs authentifiés
  "/dashboard": 6,
  "/dashboard/orders": 6,
  "/dashboard/wishlist": 6,
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Trouver le niveau maximum requis (plus petit = plus restrictif)
  let requiredMaxLevel = 6; // Par défaut, tous les utilisateurs authentifiés
  for (const [route, maxLevel] of Object.entries(DASHBOARD_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      requiredMaxLevel = Math.min(requiredMaxLevel, maxLevel);
    }
  }

  // Stocker le niveau requis dans les headers pour le Server Component
  const response = NextResponse.next();
  response.headers.set("x-required-level", String(requiredMaxLevel));

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
