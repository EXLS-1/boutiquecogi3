import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function isAdminRole(role?: string | null) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "super_admin";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/403");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="text-lg font-semibold text-cyan-900">
            Admin COGI
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-cyan-700">
              Tableau de bord
            </Link>
            <Link href="/admin/orders" className="hover:text-cyan-700">
              Commandes
            </Link>
            <Link href="/" className="text-zinc-500 hover:text-zinc-800">
              Boutique
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
