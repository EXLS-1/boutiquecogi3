"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SignedUpForm() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Compte créé</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p>Votre compte a été créé avec succès.</p>
        <Link href="/auth/login" className="underline">
          Aller à la connexion
        </Link>
      </CardContent>
    </Card>
  );
}