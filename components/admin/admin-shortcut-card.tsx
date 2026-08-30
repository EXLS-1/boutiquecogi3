// components/admin/admin-shortcut-card.tsx
"use client";

/**
 * Carte atomique représentant un module admin.
 *
 * - Réutilisable hors du contexte des raccourcis.
 * - Reçoit uniquement des props, aucune logique métier.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AdminShortcutCardProps = {
  /** Identifiant unique pour la clé React */
  id: string;
  /** Titre du module */
  title: string;
  /** Description courte */
  description: string;
  /** Route interne */
  href: string;
  /** Libellé du CTA */
  cta: string;
  /** Icône Lucide */
  icon: LucideIcon;
  /** Classe de couleur Tailwind pour l'icône */
  tone?: string;
};

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminShortcutCard({
  id,
  title,
  description,
  href,
  cta,
  icon: Icon,
  tone,
}: AdminShortcutCardProps) {
  return (
    <Card
      key={id}
      className="border-neutral-800 bg-neutral-900 text-neutral-100"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {/* Icône contextuelle avec couleur conditionnelle */}
        <Icon className={cn("h-5 w-5", tone)} aria-hidden="true" />
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <CardDescription className="text-neutral-400">
          {description}
        </CardDescription>

        <Button
          asChild
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
