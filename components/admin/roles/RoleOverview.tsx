// components/admin/roles/RoleOverview.tsx
// ============================================================
// Module 1 : Statistiques et vue d'ensemble.
// Composant purement présentatif (aucun état) → Server Component.
// ============================================================

import { ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RoleOverviewProps {
  totalRoles: number;
  activeRoles: number;
}

export function RoleOverview({ totalRoles, activeRoles }: RoleOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Total des Rôles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">{totalRoles}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-green-600" />
            Rôles Actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums text-green-600">{activeRoles}</p>
        </CardContent>
      </Card>
    </div>
  );
}