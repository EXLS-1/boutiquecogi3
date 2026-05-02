"use client";

import { authClient } from "@/lib/auth-client";
import { LogoutButton } from "@/components/auth/logout-button";

export function LoggedForm() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p>Chargement...</p>;
  if (!session) return <p>Non connecté</p>;

  return (
    <div className="flex flex-col gap-4">
      <p>Connecté en tant que {session.user.email}</p>
      <LogoutButton />
    </div>
  );
}