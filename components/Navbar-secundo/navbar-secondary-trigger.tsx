// components/navbar-secundo/navbar-secondary-trigger.tsx
// Ce composant est un déclencheur générique pour la barre de navigation secondaire. Il est conçu pour être flexible et réutilisable, permettant d'afficher une icône personnalisée et un label accessible pour garantir la conformité WCAG / A11y. L'icône par défaut a été remplacée par 'Settings' conformément aux exigences de design, mais il peut être facilement remplacé par n'importe quelle autre icône de lucide-react ou même une icône personnalisée.
// Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier
// Il est également optimisé pour la performance et l'accessibilité.

"use client";

import React from "react";
import { Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarSecondaryTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Icône optionnelle. Par défaut, utilise l'icône 'Settings' de lucide-react.
   */
  icon?: LucideIcon;
  /**
   * Label accessible obligatoire pour garantir la conformité WCAG / A11y.
   */
  label: string;
}

/**
 * Déclencheur robuste et modulaire pour la barre de navigation secondaire.
 * L'icône par défaut a été remplacée par 'Settings' conformément aux exigences de design.
 */
export function NavbarSecondaryTrigger({
  icon: Icon = Settings,
  label,
  className,
  ...props
}: NavbarSecondaryTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md p-2 text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        className
      )}
      aria-label={label}
      {...props}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
