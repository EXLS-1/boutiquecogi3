// components/dashboard/Admin-dashboard-menu.ts
"use client";

export default function buildDashboardMenu () {
  return [
    {
      title: "Vue générale",
      items: [{ href: "/dashboard", label: "Overview" }],
    },
    {
      title: "Menus de Pilotage",
      items: [
        { href: "/dashboard/categories", label: "Activités Récentes" },
        { href: "/dashboard/products", label: "Produits Populaires" },
        { href: "/dashboard/orders", label: "Commandes Récentes" },
        { href: "/dashboard/analytics", label: "Analytique" },
        { href: "/dashboard/treasury", label: "Trésorerie" },
        { href: "/dashboard/media", label: "Médias" },
        { href: "/dashboard/wishlist", label: "Wishlist" },
        { href: "/dashboard/videos", label: "Vidéos" },
        { href: "/dashboard/payments", label: "Paiements" },
        { href: "/dashboard/users", label: "Utilisateurs" },
        { href: "/dashboard/audit-log", label: "Audit Log" },
        { href: "/dashboard/heatmap", label: "Heatmap" },
      ] as { href: string; label: string }[],
    },
    
    {
      title: "Administration",
      items: [
        { href: "/admin", label: "Portail Admin" }
      ] as { href: string; label: string }[],
    },
  ];
}
