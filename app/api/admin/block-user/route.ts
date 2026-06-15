// app/api/admin/block-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  Role,
  canBlockUser,
  canBlockAdmin,
  canBlockSuperAdmin,
} from "@/lib/auth/rbac/constants";

function getUserRoleFromRequest(req: NextRequest): Role | null {
  // Idem : adapte avec ta logique réelle (JWT, session, etc.)
  const session = req.headers.get("x-session") ?? null;
  if (!session) return null;
  // return decoded.role as Role;
  return null;
}

function getTargetUserRoleFromRequest(req: NextRequest): Role | null {
  // Exemple : tu récupères le rôle de la cible dans le body ou un paramètre
  // Par exemple : body.targetRole = "user" | "admin" | "super_admin"
  // Ici, pour l'exemple, on suppose que c'est passé dans le body.
  // À adapter avec ta logique réelle.
  return null;
}

export async function POST(req: NextRequest) {
  const userRole = getUserRoleFromRequest(req);
  const targetUserRole = getTargetUserRoleFromRequest(req);

  if (!userRole) {
    return NextResponse.json(
      { error: "Unauthorized: utilisateur non connecté." },
      { status: 401 },
    );
  }

  if (!targetUserRole) {
    return NextResponse.json(
      { error: "targetRole est requis (user, admin, super_admin)." },
      { status: 400 },
    );
  }

  // Règles de blocage :
  // - Seul super_admin peut bloquer admin ET user ET super_admin
  // - admin peut bloquer user, mais pas admin, pas super_admin
  // - user ne peut bloquer personne

  if (targetUserRole === "user") {
    // Pour bloquer un user : admin ou super_admin
    if (!canBlockUser(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: tu ne peux pas bloquer un user." },
        { status: 403 },
      );
    }
  } else if (targetUserRole === "admin") {
    // Pour bloquer un admin : seul super_admin
    if (!canBlockAdmin(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: seul super_admin peut bloquer un admin." },
        { status: 403 },
      );
    }
  } else if (targetUserRole === "super_admin") {
    // Pour bloquer un super_admin : seul super_admin (avec BLOCK_SUPER_ADMIN)
    if (!canBlockSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: seul super_admin peut bloquer un super_admin." },
        { status: 403 },
      );
    }
  } else {
    return NextResponse.json(
      { error: "targetRole invalide." },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId est requis." },
        { status: 400 },
      );
    }

    // TODO : bloquer l'utilisateur dans ta DB
    // Exemple fictif :
    // await blockUser(targetUserId);

    return NextResponse.json(
      { success: true, message: "Utilisateur bloqué avec succès." },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors du blocage de l'utilisateur." },
      { status: 500 },
    );
  }
}
