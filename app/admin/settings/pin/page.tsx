// app/admin/settings/pin/page.tsx
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { PinManagement } from "./pin-management";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Gestion PIN Admin | SUPER_ADMIN",
  description: "Créer, modifier ou désactiver le code PIN de sécurité",
};

export default async function PinSettingsPage() {
  const session = await getServerRBACSession();

  if (!session) redirect("/auth/sign-in?callbackUrl=/admin/settings/pin");

  // Réservé au SUPER_ADMIN (niveau 1)
  if (session.level !== 1) redirect("/unauthorized");

  return (
    <div className="min-h-screen bg-cyan-100 p-6 md:p-10 space-y-8">
      <div className="border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-2 text-emerald-500 mb-1">
          <Shield className="h-5 w-5" />
          <span className="text-xs font-mono uppercase tracking-widest font-semibold">
            SUPER_ADMIN
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">
          Gestion du code PIN
        </h1>
        <p className="text-cyan-600 text-sm mt-1">
          Créer, modifier ou désactiver le code PIN de sécurité admin
        </p>
      </div>

      <PinManagement />
    </div>
  );
}
