// components/admin/admin-module-shortcuts.tsx

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FileClock,
  Gauge,
  KeyRound,
  LockKeyhole,
  PackageCheck,
  PackagePlus,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Truck,
  UserCheck,
  UserCog,
  UserMinus,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

type AdminModule = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: string;
};

type AdminShortcutGroup = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  modules: AdminModule[];
};

const shortcutGroups: AdminShortcutGroup[] = [
  {
    id: "DASHBOARD",
    label: "01. DASHBOARD",
    eyebrow: "Vue globale",
    title: "Modules de pilotage",
    description: "Acces rapide aux indicateurs (KPI) principaux, journaux et actions prioritaires.",
    modules: [
      {
        title: "ACTIVITES RECENTES",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "ALERTES OPERATIONNELLES",
        description: "Acceder aux raccourcis d'alertes sur les seuils critiques.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "CLIENT",
        description: "Ouvrir la vue dashboard principale et suivre les indicateurs RBAC.",
        href: "/dashboard",
        cta: "Afficher",
        icon: Gauge,
        tone: "text-cyan-500",
      },
      {
        title: "PRODUIT",
        description: "Consulter les evenements systeme et les operations sensibles.",
        href: "/dashboard/audit",
        cta: "Afficher",
        icon: Activity,
        tone: "text-amber-500",
      },
      {
        title: "COMMANDE",
        description: "Analyser les performances, volumes et tendances commerciales.",
        href: "/dashboard/analytics",
        cta: "Afficher",
        icon: BarChart3,
        tone: "text-blue-500",
      },
      {
        title: "PANIER",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "VENTE",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "PAIEMENT",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "CHIFFRE D'AFFAIRE",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "STOCK",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      {
        title: "GRAPHIQUE",
        description: "Acceder aux raccourcis d'administration les plus utilises.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-emerald-500",
      },
      
    ],
  },
  {
    id: "GESTION DES PRODUITS",
    label: "02. PRODUIT",
    eyebrow: "Catalogue",
    title: "Modules produits",
    description: "Creer, importer, publier et organiser les produits du catalogue.",
    modules: [
      {
        title: "LOGIQUES PRODUITS",
        description: "Administrer les fiches produits, images, prix et statuts.",
        href: "/admin/product",
        cta: "Gerer",
        icon: Boxes,
        tone: "text-cyan-500",
      },
      {
        title: "CRUD PRODUITS",
        description: "Reprendre les produits importes ou sauvegardes avant publication.",
        href: "/admin/product/drafts",
        cta: "Voir les brouillons",
        icon: PackagePlus,
        tone: "text-amber-500",
      },
      {
        title: "INFOS PRODUITS",
        description: "Classer les produits et maintenir les familles du catalogue.",
        href: "/dashboard/categories",
        cta: "Organiser",
        icon: Tags,
        tone: "text-emerald-500",
      },
      {
        title: "VARIANTES PRODUITS",
        description: "Classer les produits et maintenir les familles du catalogue.",
        href: "/dashboard/categories",
        cta: "Organiser",
        icon: Tags,
        tone: "text-emerald-500",
      },
      {
        title: "MEDIA",
        description: "Controler les images, videos et ressources rattachees.",
        href: "/dashboard/media",
        cta: "Medias",
        icon: PackageCheck,
        tone: "text-blue-500",
      },
      {
        title: "IMPORT CSV",
        description: "Charger rapidement des donnees produits en volume.",
        href: "/admin/product",
        cta: "Importer",
        icon: ClipboardList,
        tone: "text-rose-500",
      },
    ],
  },
  {
    id: "INVENTAIRE (Stock)",
    label: "03. INVENTAIRE",
    eyebrow: "Inventaire",
    title: "Modules stock",
    description: "Suivre les disponibilites, mouvements et besoins d'approvisionnement.",
    modules: [
      {
        title: "ETAT STOCK",
        description: "Consulter les quantites disponibles par produit et variante.",
        href: "/admin/stock",
        cta: "Voir le stock",
        icon: Warehouse,
        tone: "text-emerald-500",
      },
      {
        title: "FONCTIONALITE STOCK",
        description: "Tracer les entrees, sorties, corrections et ajustements.",
        href: "/admin/stock",
        cta: "Analyser",
        icon: Activity,
        tone: "text-amber-500",
      },
      {
        title: "STOCK CRITIQUE",
        description: "Reperer les alertes de rupture ou seuils critiques.",
        href: "/admin/product",
        cta: "Verifier",
        icon: PackageCheck,
        tone: "text-rose-500",
      },
      {
        title: "LEDGER",
        description: "Croiser l'inventaire avec les commandes en cours.",
        href: "/admin/order",
        cta: "Voir commandes",
        icon: Truck,
        tone: "text-blue-500",
      },
    ],
  },
  {
    id: "orders",
    label: "08. Commandes",
    eyebrow: "Operations",
    title: "Modules commandes",
    description: "Piloter les commandes, paiements, livraisons et controles associes.",
    modules: [
      {
        title: "Liste commandes",
        description: "Suivre les commandes, statuts et details client.",
        href: "/admin/order",
        cta: "Ouvrir",
        icon: ClipboardList,
        tone: "text-blue-500",
      },
      {
        title: "Paiements",
        description: "Verifier les transactions et rapprochements de paiement.",
        href: "/dashboard/checkout",
        cta: "Controler",
        icon: CreditCard,
        tone: "text-emerald-500",
      },
      {
        title: "Expedition",
        description: "Acceder aux donnees utiles au traitement logistique.",
        href: "/admin/order",
        cta: "Traiter",
        icon: Truck,
        tone: "text-cyan-500",
      },
      {
        title: "Audit commandes",
        description: "Consulter les traces de modifications sur les commandes.",
        href: "/dashboard/audit",
        cta: "Auditer",
        icon: FileClock,
        tone: "text-amber-500",
      },
    ],
  }, 
  {
    id: "roles",
    label: "03. Roles",
    eyebrow: "RBAC",
    title: "Permissions et roles",
    description: "Configurer les niveaux, permissions et protections des roles sensibles.",
    modules: [
      {
        title: "Table des roles",
        description: "Creer, ajuster ou bloquer les roles d'administration.",
        href: "/admin/role",
        cta: "Gerer les roles",
        icon: Shield,
        tone: "text-emerald-500",
      },
      {
        title: "Matrice RBAC",
        description: "Comparer les permissions par role, niveau et zone applicative.",
        href: "/dashboard/settings",
        cta: "Ouvrir RBAC",
        icon: ShieldCheck,
        tone: "text-cyan-500",
      },
      {
        title: "Audit permissions",
        description: "Controler les changements de droits et les operations critiques.",
        href: "/dashboard/audit",
        cta: "Auditer",
        icon: FileClock,
        tone: "text-amber-500",
      },
    ],
  },
  {
    id: "security",
    label: "04. Configuration 2FA",
    eyebrow: "Securite",
    title: "Securite et double authentification",
    description: "Options dediees au 2FA, aux sessions et aux controles sensibles.",
    modules: [
      {
        title: "Configuration 2FA",
        description: "Activer, verifier ou mettre a jour l'authentification a deux facteurs.",
        href: "/admin/setup-2fa",
        cta: "Configurer",
        icon: KeyRound,
        tone: "text-emerald-500",
      },
      {
        title: "Verification 2FA",
        description: "Valider les sessions administrateur protegees par code.",
        href: "/admin/setup-2fa",
        cta: "Verifier",
        icon: LockKeyhole,
        tone: "text-rose-500",
      },
      {
        title: "Contexte securite",
        description: "Consulter les traces et signaux lies aux acces privilegies.",
        href: "/dashboard/audit",
        cta: "Consulter",
        icon: Activity,
        tone: "text-amber-500",
      },
    ],
  },
  {
    id: "users",
    label: "05. Utilisateurs",
    eyebrow: "Personnel",
    title: "Administration utilisateurs",
    description: "Raccourcis pour les profils, blocages, permissions et activite.",
    modules: [
      {
        title: "Liste utilisateurs",
        description: "Rechercher, filtrer et administrer les utilisateurs existants.",
        href: "/admin/users",
        cta: "Ouvrir",
        icon: Users,
        tone: "text-blue-500",
      },
      {
        title: "Roles utilisateur",
        description: "Ajuster les rattachements RBAC et niveaux d'acces.",
        href: "/admin/role",
        cta: "Modifier",
        icon: UserCog,
        tone: "text-violet-500",
      },
      {
        title: "Deblocage",
        description: "Identifier les comptes bloques et retablir un acces valide.",
        href: "/admin/users",
        cta: "Debloquer",
        icon: UserCheck,
        tone: "text-emerald-500",
      },
      {
        title: "Audit utilisateur",
        description: "Examiner les evenements lies aux comptes et sessions.",
        href: "/dashboard/audit",
        cta: "Auditer",
        icon: FileClock,
        tone: "text-amber-500",
      },
      {
        title: "Parametres utilisateur",
        description: "Acceder aux reglages applicatifs lies a la gestion des comptes.",
        href: "/dashboard/settings",
        cta: "Parametrer",
        icon: Settings,
        tone: "text-slate-500",
      },
    ],
  },
  
  {
    id: "payments",
    label: "09. Paiement",
    eyebrow: "Finance",
    title: "Modules paiement",
    description: "Surveiller les paiements, validations et reglages financiers.",
    modules: [
      {
        title: "Checkout",
        description: "Consulter les flux de paiement et commandes associees.",
        href: "/dashboard/checkout",
        cta: "Ouvrir",
        icon: CreditCard,
        tone: "text-emerald-500",
      },
      {
        title: "Transactions",
        description: "Verifier les references, montants et statuts de paiement.",
        href: "/dashboard/treasury",
        cta: "Voir tresorerie",
        icon: Receipt,
        tone: "text-blue-500",
      },
      {
        title: "Parametres paiement",
        description: "Ajuster les options de paiement et integrations actives.",
        href: "/dashboard/settings",
        cta: "Configurer",
        icon: SlidersHorizontal,
        tone: "text-slate-500",
      },
    ],
  },
  {
    id: "settings",
    label: "10. Parametres",
    eyebrow: "Configuration",
    title: "Modules de configuration",
    description: "Raccourcis vers les reglages systeme, securite, roles et application.",
    modules: [
      {
        title: "Parametres generaux",
        description: "Modifier les reglages principaux de l'administration.",
        href: "/dashboard/settings",
        cta: "Ouvrir",
        icon: Settings,
        tone: "text-slate-500",
      },
      {
        title: "Parametres avances",
        description: "Acceder aux options avancees reservees aux administrateurs.",
        href: "/admin/settings/advanced",
        cta: "Avance",
        icon: SlidersHorizontal,
        tone: "text-cyan-500",
      },
      {
        title: "Securite",
        description: "Revoir les protections d'acces et controles privilegies.",
        href: "/admin/setup-2fa",
        cta: "Securiser",
        icon: LockKeyhole,
        tone: "text-rose-500",
      },
      {
        title: "Roles et permissions",
        description: "Configurer les roles disponibles et leurs permissions.",
        href: "/admin/role",
        cta: "Roles",
        icon: ShieldCheck,
        tone: "text-emerald-500",
      },
    ],
  },
];

export function AdminModuleShortcuts() {
  const [activeGroupId, setActiveGroupId] = useState(shortcutGroups[0].id);
  const activeGroup = useMemo(
    () => shortcutGroups.find((group) => group.id === activeGroupId) ?? shortcutGroups[0],
    [activeGroupId],
  );

  return (
    <div className="flex flex-col items-start gap-8 lg:flex-row">
      <aside className="w-full shrink-0 space-y-6 lg:w-64">
        <div className="flex flex-col items-stretch gap-2">
          {shortcutGroups.map((group) => {
            const isActive = group.id === activeGroup.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                  isActive
                    ? "border-emerald-400 bg-white text-emerald-700 shadow-sm"
                    : "border-cyan-200 bg-cyan-50 text-cyan-600 hover:border-rose-200 hover:bg-white hover:text-rose-500",
                )}
                aria-pressed={isActive}
              >
                <span className="block">{group.label}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {group.modules.length} module{group.modules.length > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}

          <SignOutButton className="mt-3 bg-rose-100 text-red-500 shadow-sm transition-all duration-300 hover:bg-rose-500 hover:text-white active:scale-95">
            Deconnexion
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 space-y-5">
        <div className="rounded-lg border border-cyan-200 bg-white/80 p-5 text-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {activeGroup.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-cyan-500">{activeGroup.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-cyan-400">{activeGroup.description}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeGroup.modules.map((module) => {
            const Icon = module.icon;

            return (
              <Card key={`${activeGroup.id}-${module.title}`} className="border-neutral-800 bg-neutral-900 text-neutral-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold">{module.title}</CardTitle>
                  <Icon className={cn("h-5 w-5", module.tone)} />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <CardDescription className="text-neutral-400">{module.description}</CardDescription>
                  <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href={module.href}>{module.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
