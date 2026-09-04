// app/admin/roles/page.tsx
// ============================================================
// Page Admin "Rôles" — Server Component pur (aucune logique UI).
// Orchestre uniquement les modules & récupère les données serveur.
// ============================================================

import type { Metadata } from 'next';

import { getRolesAction } from '@/lib/roles/role-actions';
import { RoleOverview } from '@/components/admin/roles/RoleOverview';
import { RoleDataTable } from '@/components/admin/roles/RoleDataTable';
import { RoleFormModal } from '@/components/admin/roles/RoleFormModal';
import { RolePermissionsMatrix } from '@/components/admin/roles/RolePermissionsMatrix';

// Optimisation SEO stricte : page admin protégée, exclue de l'indexation.
export const metadata: Metadata = {
  title: 'Gestion des Rôles | Admin - Boutique Cogi',
  description:
    'Gérez les rôles utilisateurs et leurs permissions sur la plateforme e-commerce Boutique Cogi.',
  robots: 'noindex, nofollow',
};

export default async function AdminRolesPage() {
  const result = await getRolesAction();
  const roles = result.success ? result.data : [];

  // Calculs atomiques pour le module Overview.
  const totalRoles = roles.length;
  const activeRoles = roles.filter((r) => r.isActive).length;

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <header className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des Rôles</h1>
        <p className="text-muted-foreground">
          Configurez les rôles et les niveaux d&apos;accès pour les administrateurs.
        </p>
      </header>

      {/* Module 1 : Vue d'ensemble */}
      <RoleOverview totalRoles={totalRoles} activeRoles={activeRoles} />

      {/* Module 2 : Table de données */}
      <RoleDataTable roles={roles} />

      {/* Modules 3 & 4 : Modales (Client Components) */}
      <RoleFormModal />
      <RolePermissionsMatrix />
    </main>
  );
}