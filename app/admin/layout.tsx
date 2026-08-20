// app/admin/layout.tsx
// Protected layout for admin pages — forces 2FA setup for SUPER_ADMIN without 2FA

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roleConfig: { select: { role: true } },
      userSecurities: { select: { twoFactorEnabled: true } },
    },
  });

  const isSuperAdmin = user?.roleConfig?.role === "SUPER_ADMIN";
  const has2FA = user?.userSecurities?.[0]?.twoFactorEnabled ?? false;

  // SUPER_ADMIN sans 2FA = redirection forcée (sauf si déjà sur la page de setup)
  if (isSuperAdmin && !has2FA && pathname !== "/admin/setup-2fa") {
    redirect("/admin/setup-2fa");
  }

  return <>{children}</>;
}
