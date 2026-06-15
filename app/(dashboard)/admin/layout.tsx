// /app/(dashboard)/admin/layout.tsx
// ============================================
// Layout protégé — Server Component
// ============================================
import { headers } from "next/headers";
import * as auth from "@/lib/auth";

import { getCurrentUserWithRole, requireMinLevel, ROLES } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import AdminSidebar from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const headersList = headers();
  const session = await auth.api.getSession({ 
      headers: headersList,
    });
    // Redirige si niveau > 2 (seuls Super Admin et Admin)

  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  await requireMinLevel(ROLES.ADMIN.level, session.user.role);
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main>{children}</main>
    </div>
  );
}