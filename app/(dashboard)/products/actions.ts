// /app/(dashboard)/products/actions.ts
"use server";

import { withPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  // ...
});

export async function createProduct(formData: FormData) {
  return withPermission(PERMISSIONS.PRODUCTS_CREATE, async (role) => {
    const data = Object.fromEntries(formData);
    const parsed = createProductSchema.safeParse(data);

    if (!parsed.success) {
      throw new Error("Invalid data");
    }

    // Vérification des restrictions (quota produits)
    const maxProducts = await getNumericRestriction(
      role,
      RESTRICTIONS.MAX_PRODUCTS_PER_USER,
    );

    const currentCount = await prisma.product.count({
      where: { createdBy: role }, // adapter selon ton schema
    });

    if (currentCount >= maxProducts) {
      throw new Error(`Product limit reached: ${maxProducts}`);
    }

    const product = await prisma.product.create({
      data: parsed.data,
    });

    revalidatePath("/products");
    return { success: true, product };
  });
}
