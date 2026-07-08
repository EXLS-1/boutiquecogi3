// app/actions/admin/user.admin.actions.ts
"use server";

import { prisma } from "@/lib/prisma/client";
import { auth } from "@/lib/auth/auth"; // Instance serveur de Better-Auth
import { headers } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Schéma de validation pour garantir l'intégrité des données
const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["user", "admin", "super_admin"]),
});

/**
 * Server Action: updateUserRole
 * Permet aux super-admins de modifier le rôle d'un utilisateur.
 */
export async function updateUserRole(formData: z.infer<typeof updateRoleSchema>) {
  // 1. Vérification de la session côté serveur (Sécurité maximale)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // 2. Contrôle d'accès strict (RBAC)
  if (!session || session.user.role !== "super_admin") {
    return {
      error: "Non autorisé : Seuls les super-admins peuvent modifier les rôles.",
      status: 403,
    };
  }

  // 3. Validation des entrées avec Zod
  const validatedFields = updateRoleSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: "Données invalides.", status: 400 };
  }

  try {
    // 4. Mise à jour en base de données via Prisma
    await prisma.user.update({
      where: { id: validatedFields.data.userId },
      data: { role: validatedFields.data.newRole },
    });

    // 5. Purge du cache pour mettre à jour l'interface
    revalidatePath("/admin/customers");
    return { success: true, message: "Rôle mis à jour avec succès." };
  } catch (error) {
    console.error("[UPDATE_USER_ROLE_ERROR]:", error);
    return { error: "Erreur lors de la mise à jour en base de données.", status: 500 };
  }
}
