// components/newsletter/newsletter-success.client.tsx
"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NewsletterSuccessProps {
  message: string;
  onReset: () => void;
}

export function NewsletterSuccess({ message, onReset }: NewsletterSuccessProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 px-4 text-center animate-in fade-in zoom-in duration-500 ease-out"
      role="alert"
    >
      <div className="mb-4 rounded-full bg-emerald-100 p-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-bounce" />
      </div>
      <h3 className="text-4xl font-bold text-neutral-900 font-playfair">
        Inscription à la Newsletter réussie !
      </h3>
      <p className="text-neutral-500 mt-2 max-w-sm">
        {message} Vous recevrez bientôt nos meilleures offres.
      </p>
      <Button
        variant="link"
        onClick={onReset}
        className="mt-6 text-neutral-400 hover:text-black transition-colors"
      >
        S'inscrire avec une autre adresse
      </Button>
    </div>
  );
}