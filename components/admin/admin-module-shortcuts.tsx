// components/admin/admin-module-shortcuts.tsx
"use client";

/**
 * Composition principale du portail de raccourcis admin.
 *
 * - Page minimaliste : délégue tout aux atomes.
 * - Données importées depuis `lib/constants` (DRY).
 * - Logique d'état locale minimale (groupe actif).
 */

import { useMemo, useState } from "react";

import { ADMIN_SHORTCUT_GROUPS } from "@/lib/constants/admin-shortcuts";
import { AdminShortcutSidebar } from "@/components/admin/admin-shortcut-sidebar";
import { AdminShortcutCard } from "@/components/admin/admin-shortcut-card";

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminModuleShortcuts() {
  /* État : groupe actif (premier groupe par défaut) */
  const [activeGroupId, setActiveGroupId] = useState(
    ADMIN_SHORTCUT_GROUPS[0].id,
  );

  /* Mémoïsation du groupe actif pour éviter les recalculs inutiles */
  const activeGroup = useMemo(
    () =>
      ADMIN_SHORTCUT_GROUPS.find((g) => g.id === activeGroupId) ??
      ADMIN_SHORTCUT_GROUPS[0],
    [activeGroupId],
  );

  return (
    <div className="flex flex-col items-start gap-8 lg:flex-row">
      {/* ── Sidebar ── */}
      <AdminShortcutSidebar
        groups={ADMIN_SHORTCUT_GROUPS}
        activeGroupId={activeGroupId}
        onSelect={setActiveGroupId}
      />

      {/* ── Contenu principal ── */}
      <main className="flex-1 space-y-5">
        {/* En-tête du groupe actif */}
        <header className="rounded-lg border border-cyan-200 bg-white/80 p-5 text-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {activeGroup.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-cyan-500">
            {activeGroup.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-cyan-400">
            {activeGroup.description}
          </p>
        </header>

        {/* Grille des modules */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeGroup.modules.map((module) => (
            <AdminShortcutCard
              key={`${activeGroup.id}-${module.title}`}
              id={`${activeGroup.id}-${module.title}`}
              title={module.title}
              description={module.description}
              href={module.href}
              cta={module.cta}
              icon={module.icon}
              tone={module.tone}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
