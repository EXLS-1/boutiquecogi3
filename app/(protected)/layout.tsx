// app/(protected)/layout.tsx
import { auth } from "@/lib/auth"; // BetterAuth
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAuthorized = false;

  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    isAuthorized = !!session?.user;
  } catch (error) {
    isAuthorized = false;
  }

  // Redirection propre, libérée du try...catch
  if (!isAuthorized) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}