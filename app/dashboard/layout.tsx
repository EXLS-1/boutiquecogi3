// app/dashboard/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  requireAuth,
  getCurrentUserWithRole,
  getClientPermissions,
  getClientRestrictions,
  getRoleLevel,
} from "@/lib/auth/rbac";

type DashboardLayoutProps = {
  children: ReactNode;
};

// =============================================================================
// BLOCAGE LEVEL 6 (USER/CLIENT)
// =============================================================================
// Le dashboard est STRICTEMENT réservé au staff (niveaux 1-5)
// Level 6 = CLIENT = aucun accès, même en lecture seule

const DASHBOARD_MAX_ALLOWED_LEVEL = 5;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const role = await requireAuth("/login");
  const userData = await getCurrentUserWithRole();

  if (!userData) redirect("/login");

  const userLevel = getRoleLevel(role);

  // ❌ Level 6 (USER) et supérieur = redirection vers page d'erreur
  // ✅ Level 1-5 = accès autorisé
  if (userLevel > DASHBOARD_MAX_ALLOWED_LEVEL) {
    redirect("/unauthorized");
  }

  const permissions = await getClientPermissions(role);
  const restrictions = await getClientRestrictions(role);

  const nav = buildDashboardNav(permissions);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="text-lg font-semibold">RBAC Control Center</h1>
          <p className="mt-1 text-xs text-slate-500">
            Rôle: {userData.role} · Niveau: {userData.level}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.title}
              </h2>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          <div>Restrictions effectives</div>
          <div className="mt-1 line-clamp-4">
            {Object.entries(restrictions)
              .slice(0, 5)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div>
              <h2 className="text-base font-semibold">Dashboard</h2>
              <p className="text-xs text-slate-500">
                Accès conditionné par rôle, niveau et permissions
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>{userData.user.email ?? "Sans email"}</div>
              <div>{userData.role}</div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function buildDashboardNav(permissions: string[]) {
  const can = (p: string) => permissions.includes(p);

  return [
    {
      title: "Vue générale",
      items: [{ href: "/dashboard", label: "Overview" }],
    },
    {
      title: "Commerce",
      items: [
        can("categories:read") && { href: "/dashboard/categories", label: "Category" },
        can("orders:read") && { href: "/dashboard/orders", label: "Order" },
        can("checkout:read") && { href: "/dashboard/checkout", label: "Checkout" },
        can("wishlist:read") && { href: "/dashboard/wishlist", label: "Wishlist" },
        can("products:read") && { href: "/dashboard/products", label: "Product" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
    {
      title: "Ops & contenu",
      items: [
        can("system:logs") && { href: "/dashboard/audit", label: "Audit" },
        can("media:read") && { href: "/dashboard/media", label: "Media" },
        can("content:read") && { href: "/dashboard/video", label: "Video" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
    {
      title: "Finance",
      items: [can("analytics:read") && { href: "/dashboard/tresory", label: "Tresory" }].filter(
        Boolean,
      ) as { href: string; label: string }[],
    },
    {
      title: "Administration",
      items: [
        can("users:read") && { href: "/dashboard/users", label: "Users" },
        can("roles:read") && { href: "/dashboard/roles", label: "Roles" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
  ];
}