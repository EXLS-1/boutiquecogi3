// app/admin/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerRBACSession } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Shield, KeyRound, Users, Activity, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Administration Système | Central Security",
  description: "Portail d'administration réservé au personnel de niveau 1-2",
};

export default async function AdminPage() {
  const session = await getServerRBACSession();
    console.log("[ADMIN] session:", session);
    
  // 1. Authentification
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  // 2. Autorisation stricte : Réservé aux niveaux 1 (Super Admin) et 2 (Admin)
  if (session.level > 2) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-cyan-100 text-cyan-400 p-6 md:p-10 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-mono uppercase tracking-widest font-semibold">Zone Privilégiée</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Portail Admin</h1>
          <p className="text-cyan-400 text-sm mt-1">
            Connecté en tant que <span className="text-rose-400 font-medium">{session.userId}</span> ({session.role.name} — Niveau {session.level})
          </p>
        </div>
        <Button asChild variant="outline" className="border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-rouge-500">
          <Link href="/dashboard" className="flex items-center gap-2">
            Dashboard Admin
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-56">
          <div className="flex flex-col items-stretch gap-3 border-rouge-500 bg-cyan-50">
            <Link href="/admin/users" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Utilisateurs</Link>
            <Link href="/admin/account" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Comptes</Link>
            <Link href="/admin/role" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Rôles</Link>
            <Link href="/admin/setup-2fa" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Configuration 2FA</Link>
          </div>

          <div className="flex flex-col items-stretch gap-3">
            <Link href="/admin/product" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Produits</Link>
            <Link href="/admin/stock" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Stock</Link>
            <Link href="/admin/order" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Commandes</Link>
            <Link href="/admin/checkout" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Paiement</Link>
          </div>

          <div className="flex flex-col items-stretch gap-3">
            <Link href="/admin/settings" className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">Paramètres</Link>
            <SignOutButton className="bg-rose-100 text-red-500 hover:bg-rose-500 hover:text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium">
              Déconnexion
            </SignOutButton>
          </div>
        </aside>

        {/* Grille de modules d'administration */}
        <div className="grid flex-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Sécurité & 2FA</CardTitle>
            <KeyRound className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Configuration de l&apos;authentification à deux facteurs et gestion des clés TOTP d&apos;urgence.
            </CardDescription>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/admin/setup-2fa">Gérer le 2FA</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Gestion des Comptes</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Audit des utilisateurs, déblocage de comptes et attribution directe des rôles RBAC.
            </CardDescription>
            <Button asChild variant="secondary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/admin/users">Administrer les Utilisateurs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Logs & Audit Système</CardTitle>
            <Activity className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Inspection des journaux d&apos;évènements, traçabilité des mutations BDD et sessions actives.
            </CardDescription>
            <Button asChild variant="secondary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/dashboard/audit">Consulter les Logs</Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
