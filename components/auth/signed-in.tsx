// components/auth/signed-in.tsx
"use client";

import { authClient } from "@/lib/auth/auth-client";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function SignedForm() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p>Chargement...</p>;
  if (!session) return <p>Non connecté</p>;

  return (
    <div className="flex flex-col gap-4">
      <p>Connecté en tant que {session.user.email}</p>
      <SignOutButton />
    </div>
  );
}