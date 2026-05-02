"use client";

import { useSession } from "@/lib/auth-client"; // Ton client Better-Auth

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "user")[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { data: session, isPending } = useSession();

  if (isPending) return null;

  const userRole = session?.user?.role as "admin" | "user";

  if (!session || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}