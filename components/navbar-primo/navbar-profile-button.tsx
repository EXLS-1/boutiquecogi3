// components/navbar-primo/navbar-profile-button.tsx
"use client";

import { useState, useEffect } from "react";
import { authClient, useRBAC } from "@/lib/auth/auth-client";
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
import toast from "react-hot-toast";
import SignInButton from "@/components/auth/sign-in-button";
import SignUpButton from "@/components/auth/sign-up-button";

/**
 * Composant NavbarProfileButton
 * Gère l'affichage du statut d'authentification dans la Navbar.
 * Utilise le RBAC pour afficher les bonnes options selon le rôle de l'utilisateur.
 */
export function NavbarProfileButton() {
  const { data: session, isPending } = authClient.useSession();
  const { isAdmin, isStaff, role, roleConfig } = useRBAC();
  const router = useRouter();

  // Prevent hydration mismatch: this component is client-only.
  // Return null on the server; show skeleton until mounted + session resolved.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Déconnexion réussie");
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  const initials = session.user.name?.slice(0, 2).toUpperCase() || "U";
  const RoleIcon = roleConfig.icon;

  return (
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

      <DropdownMenuContent align="end" className="w-64 mt-2 p-2 shadow-xl border-slate-200">
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-bold leading-none text-slate-900">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-slate-500 truncate">
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

        <DropdownMenuItem asChild className="focus:bg-cyan-50 focus:text-cyan-700 cursor-pointer rounded-md">
          <Link href="/profile" className="flex items-center gap-2 w-full py-2">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
            </Avatar>
            Mon Profil
          </Link>
        </DropdownMenuItem>

        {/* Dashboard Admin — ADMIN & SUPER_ADMIN uniquement */}
        {isAdmin && (
          <DropdownMenuItem asChild className="text-orange-700 font-semibold focus:bg-orange-50 focus:text-orange-800 cursor-pointer rounded-md">
            <Link href="/admin" className="flex items-center gap-2 w-full py-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Admin
            </Link>
          </DropdownMenuItem>
        )}

        {/* Dashboard Staff — MANAGER uniquement (pas Admin déjà couvert) */}
        {isStaff && !isAdmin && (
          <DropdownMenuItem asChild className="text-yellow-700 font-semibold focus:bg-yellow-50 focus:text-yellow-800 cursor-pointer rounded-md">
            <Link href="/staff" className="flex items-center gap-2 w-full py-2">
              <RoleIcon className="h-4 w-4" />
              Espace {roleConfig.label}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer rounded-md py-2"
        >
          <LogOut className="h-4 w-4 mr-2" /> Se Déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
