// components/auth/auth-button.tsx
"use client";

import { authClient } from "@/lib/auth/auth-client";
import Link from "next/link";
import { LogOut, User, Settings, ShieldCheck } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  // Si non connecté, on ne rend rien : SignInButton et SignUpButton prennent le relais dans la navbar
  if (!session) return null;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Déconnexion réussie");
          router.push("/");
          router.refresh();
        }
      }
    });
  };

  const initials = session.user.name?.slice(0, 2).toUpperCase() || "U";

  // Normalisation du rôle pour une vérification robuste (Admin ou ADMIN)
  const isAdmin = 
    session.user.role?.toLowerCase() === "admin" || 
    session.user.role === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="outline-none focus:ring-2 focus:ring-cyan-500 rounded-full transition-opacity hover:opacity-80">
          <Avatar className="h-9 w-9 border border-cyan-100">
            <AvatarImage src={session.user.image || ""} alt={session.user.name} />
            <AvatarFallback className="bg-cyan-700 text-white text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer flex items-center gap-2">
            <User className="h-4 w-4" /> Profil
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-700 font-medium">
            <Link href="/admin" className="cursor-pointer flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Dashboard Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-700 flex items-center gap-2">
          <LogOut className="h-4 w-4" /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}