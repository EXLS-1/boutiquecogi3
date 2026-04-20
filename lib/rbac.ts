import { redirect } from "next/navigation";

interface SessionUser {
  user?: {
    id?: string;
    role?: "ADMIN" | "USER";
  };
}

export function assertAdmin(session: SessionUser) {
  if (session?.user?.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

export function requireAuth(session: SessionUser) {
  if (!session?.user?.id) {
    redirect("/login");
  }
}