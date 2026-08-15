// components/navbar-primo/navbar-profile-button.tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient, useSessionContext } from "@/lib/auth/auth-client";
import { normalizeRole, getRoleConfig, isAdminOrSuperAdmin, isStaffOrAbove } from "@/lib/auth/rbac-shared";
import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import SignInButton from "@/components/auth/sign-in-button";
import SignUpButton from "@/components/auth/sign-up-button";

/**
 * Composant NavbarProfileButton
 * Gère l'affichage du statut d'authentification dans la Navbar.
 * Utilise la session injectée par le serveur (RootLayout → RootProvider)
 * pour éviter les appels redondants à /api/auth/get-session côté client.
 */
export function NavbarProfileButton() {
  const { session } = useSessionContext();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusToast, setStatusToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!statusToast) return;

    const timer = window.setTimeout(() => {
      setStatusToast(null);
      setIsSigningOut(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [statusToast]);

  // Computed RBAC props from server session
  const rawRole = (session?.user as { role?: string } | null | undefined)?.role;
  const role = normalizeRole(rawRole);
  const roleConfig = getRoleConfig(role);
  const isAdmin = isAdminOrSuperAdmin(role);
  const isStaff = isStaffOrAbove(role);
  const isPending = session === undefined;

  // Prevent hydration mismatch: this component is client-only.
  // Return null on the server; show skeleton until mounted + session resolved.
  // useSyncExternalStore is the React 19-recommended pattern to handle
  // server/client differences without calling setState in an effect.
  const mounted = useSyncExternalStore(
    () => () => {}, // subscribe (no cleanup needed)
    () => true,     // getSnapshot (client) — always mounted on client
    () => false,    // getServerSnapshot — never mounted on server
  );

  if (!mounted || isPending) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  // Utilisateur non connecté → CTAs d'authentification
  if (!session) {
    return (
      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
        <SignUpButton />
        <SignInButton />
      </div>
    );
  }

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setStatusToast({ type: "success", message: "Déconnexion réussie" });
            router.push("/auth/sign-in");
            router.refresh();
          },
          onError: (ctx) => {
            setStatusToast({ type: "error", message: ctx.error.message || "Erreur lors de la déconnexion." });
          },
        },
      });
    } catch (error) {
      setStatusToast({ type: "error", message: "Une erreur inattendue est survenue." });
    }
  };

  const initials = session.user.name?.slice(0, 2).toUpperCase() || "U";
  const RoleIcon = roleConfig.icon;

  return (
    <>
      {statusToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div
            role={statusToast.type === "success" ? "status" : "alert"}
            className={`rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              statusToast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {statusToast.message}
          </div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative group outline-none focus:ring-2 focus:ring-cyan-500 rounded-full transition-all active:scale-95">
            <Avatar className="h-9 w-9 border border-cyan-100 shadow-sm group-hover:border-cyan-300">
              <AvatarImage src={session.user.image || ""} alt={session.user.name} />
              <AvatarFallback className="bg-cyan-700 text-white text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 mt-2 p-2 shadow-xl bg-cyan-50 border-cyan-200">
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-bold leading-none text-cyan-500">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-cyan-500 truncate">
              {session.user.email}
            </p>
            {/* Badge de rôle RBAC */}
            <Badge
              className={`w-fit gap-1 text-[10px] font-semibold px-2 py-0.5 ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass} hover:${roleConfig.bgClass}`}
            >
              <RoleIcon className="w-3 h-3" />
              {roleConfig.label}
            </Badge>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="focus:bg-cyan-200 focus:text-cyan-500 cursor-pointer rounded-md">
          <Link href="/profile" className="flex items-center gap-2 w-full py-2 text-cyan-400">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            Mon Profil
          </Link>
        </DropdownMenuItem>

        {/* Dashboard Admin — ADMIN & SUPER_ADMIN uniquement */}
        {isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-400 font-semibold focus:bg-cyan-200 focus:text-cyan-500 cursor-pointer rounded-md">
            <Link href="/admin" className="flex items-center gap-2 w-full py-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Admin
            </Link>
          </DropdownMenuItem>
        )}

        {/* Dashboard Staff — MANAGER uniquement */}
        {isStaff && !isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-400 font-semibold focus:bg-cyan-200 focus:text-cyan-500 cursor-pointer rounded-md">
            <Link href="/staff" className="flex items-center gap-2 w-full py-2">
              <RoleIcon className="h-4 w-4" />
              Espace {roleConfig.label}
            </Link>
          </DropdownMenuItem>
        )}

        {/* Dashboard Staff — EDITOR uniquement */}
        {isStaff && !isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-400 font-semibold focus:bg-cyan-200 focus:text-cyan-500 cursor-pointer rounded-md">
            <Link href="/staff" className="flex items-center gap-2 w-full py-2">
              <RoleIcon className="h-4 w-4" />
              Espace {roleConfig.label}
            </Link>
          </DropdownMenuItem>
        )}

        {/* Dashboard Staff — SUPERVISOR uniquement */}
        {isStaff && !isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-400 font-semibold focus:bg-cyan-200 focus:text-cyan-500 cursor-pointer rounded-md">
            <Link href="/staff" className="flex items-center gap-2 w-full py-2">
              <RoleIcon className="h-4 w-4" />
              Espace {roleConfig.label}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-rose-400 focus:bg-rose-100 focus:text-rose-500 cursor-pointer rounded-md py-2 disabled:opacity-70"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isSigningOut ? "En cours..." : "Se Déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
