import { redirect } from "next/navigation";

interface SessionUser {
  user?: {
    id?: string;
    role?: "ADMIN" | "USER";
  };
}

export function requireAdmin(session: any) {
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

export function requireAuth(session: any) {
  if (!session?.user?.id) {
    redirect("/login");
  }
}