// components/navbar/navbar-role.tsx
"use client";

import SignInButton from "@/components/auth/sign-in";
import SignUpButton from "@/components/auth/sign-up";
import { AuthButton } from "@/components/auth/auth-button";
import { authClient } from "@/lib/auth/auth-client";

export function NavbarRole() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex items-center space-x-2">
      {/* AuthButton (user menu) will render if session exists, otherwise null */}
      <AuthButton />
      {/* SignIn/SignUp buttons will render if no session exists, otherwise null */}
      {!session && !isPending && <SignInButton />}
      {!session && !isPending && <SignUpButton />}
    </div>
  );
}
