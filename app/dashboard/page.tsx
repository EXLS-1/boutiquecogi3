// app/dashboard/page.tsx

import { redirect } from "next/navigation";
import {
  getCurrentUserWithRole,
  getClientPermissions,
  hasPermission,
  PERMISSIONS,
} from "@/lib/auth/rbac";

type DashboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const userData = await getCurrentUserWithRole();
  if (!userData) redirect("/login");

  const permissions = await getClientPermissions(userData.role);
  const period = normalizeParam(searchParams?.period, "month");

  const [category, order, checkout, wishlist, product, audit, tresory, media, video] =
    await Promise.all([
      permissions.includes("categories:read")
        ? fetchCategoryData(userData.role, period)
        : null,
      permissions.includes("orders:read") ? fetchOrderData(userData.role, period) : null,
      permissions.includes("checkout:read") ? fetchCheckoutData(userData.role, period) : null,
      permissions.includes("wishlist:read") ? fetchWishlistData(userData.role, period) : null,
      permissions.includes("products:read") ? fetchProductData(userData.role, period) : null,
      permissions.includes("system:logs") ? fetchAuditData(userData.role, period) : null,
      permissions.includes("analytics:read") ? fetchTresoryData(userData.role, period) : null,
      permissions.includes("media:read") ? fetchMediaData(userData.role, period) : null,
      permissions.includes("content:read") ? fetchVideoData(userData.role, period) : null,
    ]);

  const tiles = [
    makeTile("Category", category),
    makeTile("Order", order),
    makeTile("Checkout", checkout),
    makeTile("Wishlist", wishlist),
    makeTile("Product", product),
    makeTile("Audit", audit),
    makeTile("Tresory", tresory),
    makeTile("Media", media),
    makeTile("Video", video),
  ].filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rôle" value={userData.role} />
        <StatCard label="Niveau" value={`Level ${userData.level}`} />
        <StatCard label="Permissions" value={String(permissions.length)} />
        <StatCard label="Période" value={period} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {tiles.map((tile) => (
          <DashboardBlock key={tile.title} title={tile.title} subtitle={tile.subtitle}>
            {tile.content}
          </DashboardBlock>
        ))}
      </section>
    </div>
  );
}

function normalizeParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function makeTile(title: string, data: any) {
  if (!data) return null;
  return {
    title,
    subtitle: data.subtitle ?? "Données détaillées",
    content: <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>,
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function DashboardBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

async function fetchCategoryData(role: string, period: string) {
  return {
    subtitle: "Catégories, hiérarchie, taux d’activité, visibilité",
    role,
    period,
    total: 24,
    active: 19,
    inactive: 5,
    topCategories: [],
  };
}

async function fetchOrderData(role: string, period: string) {
  return {
    subtitle: "Commandes, statuts, montants, anomalies",
    role,
    period,
    total: 312,
    pending: 41,
    paid: 238,
    cancelled: 33,
  };
}

async function fetchCheckoutData(role: string, period: string) {
  return {
    subtitle: "Panier, conversion, abandons, succès paiement",
    role,
    period,
    conversionRate: "3.8%",
    abandonmentRate: "41%",
  };
}

async function fetchWishlistData(role: string, period: string) {
  return {
    subtitle: "Produits favoris, tendances, intentions d'achat",
    role,
    period,
    totalUsers: 88,
    totalItems: 421,
  };
}

async function fetchProductData(role: string, period: string) {
  return {
    subtitle: "Catalogue, stock, variantes, prix",
    role,
    period,
    total: 948,
    lowStock: 27,
    draft: 12,
  };
}

async function fetchAuditData(role: string, period: string) {
  return {
    subtitle: "Logs sensibles, actions, traçabilité",
    role,
    period,
    events: 1204,
    riskSignals: 8,
  };
}

async function fetchTresoryData(role: string, period: string) {
  return {
    subtitle: "Trésorerie, flux, marges, soldes",
    role,
    period,
    revenue: 182000,
    expenses: 94000,
    balance: 88000,
  };
}

async function fetchMediaData(role: string, period: string) {
  return {
    subtitle: "Images, fichiers, uploads, stockage",
    role,
    period,
    items: 530,
    storageMb: 18420,
  };
}

async function fetchVideoData(role: string, period: string) {
  return {
    subtitle: "Vidéos, publications, engagement",
    role,
    period,
    items: 74,
    published: 61,
  };
}