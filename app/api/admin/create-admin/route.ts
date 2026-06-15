// app/api/admin/create-admin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { canCreateAdmin, Role } from "@/lib/auth/rbac/constants";

// Quant à l'authentification, supposons que tu as un helper :
// - getUserRoleFromRequest(req): Role | null
// Si tu n'as pas ça, tu peux adapter avec ta propre logique (JWT, session, etc.)
function getUserRoleFromRequest(req: NextRequest): Role | null {
  // Exemple fictif : tu récupères le rôle dans la session ou le JWT
  // Remplace par ta logique réelle.
  const session = req.headers.get("x-session") ?? null;
  if (!session) return null;

  // Décode ta session / JWT ici, puis :
  // return decoded.role as Role;
  // Pour l'exemple, on retourne null :
  return null;
}

export async function POST(req: NextRequest) {
  const userRole = getUserRoleFromRequest(req);

  if (!canCreateAdmin(userRole)) {
    return NextResponse.json(
      { error: "Forbidden: seul super_admin peut créer un admin." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email et password sont requis." },
        { status: 400 },
      );
    }

    // TODO : créer l'utilisateur avec rôle "admin" dans ta DB
    // Exemple fictif :
    // const newUser = await createUser({ email, password, role: "admin" });

    return NextResponse.json(
      { success: true, message: "Admin créé avec succès." },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de la création de l'admin." },
      { status: 500 },
    );
  }
}
