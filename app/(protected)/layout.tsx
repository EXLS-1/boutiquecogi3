// /app/(protected)/layout.tsx
import { requireUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }) {
  try {
    await requireUser();
  } catch {
    redirect("/auth/login");
  }

  return <>{children}</>;
}
