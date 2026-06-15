// /app/api/admin/users/route.ts
// ============================================
// API Route avec vérification RBAC stricte
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserRole,
  hasPermission,
  PERMISSIONS,
} from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  const role = await getCurrentUserRole();

  if (!(await hasPermission(role, PERMISSIONS.USERS_READ))) {
    return NextResponse.json(
      { error: "Forbidden", code: "INSUFFICIENT_PERMISSIONS" },
      { status: 403 },
    );
  }

  // Logique métier...
  const users = await prisma.user.findMany({
    // Si restriction RESTRICTED_TO_OWN_DATA, filtrer ici
  });

  return NextResponse.json({ users });
}

export async function DELETE(request: NextRequest) {
  const role = await getCurrentUserRole();

  // Vérifie permission + restriction éventuelle
  if (!(await hasPermission(role, PERMISSIONS.USERS_DELETE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Vérifie si require_approval_for_delete est ON
  const needsApproval = await isRestrictionEnabled(
    role,
    RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE,
  );

  if (needsApproval) {
    // Mettre en file d'attente d'approbation au lieu de supprimer
    return NextResponse.json(
      { pending: true, message: "Deletion queued for approval" },
      { status: 202 },
    );
  }

  // Suppression directe...
}
