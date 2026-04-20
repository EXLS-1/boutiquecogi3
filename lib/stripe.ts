import { redirect } from "next/navigation";

interface SessionUser {
  user?: {
    id?: string;
    role?: "ADMIN" | "USER";
  };
}

export function requireAdmin(session: SessionUser) {
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }
}

export function requireAuth(session: SessionUser) {
  if (!session?.user?.id) {
    redirect("/login");
  }
}