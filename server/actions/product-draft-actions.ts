// server/actions/product-draft-actions.ts
// =============================================================================
// SERVER ACTIONS — CRUD complet des produits et de leurs variants
// =============================================================================
// Alimente la page /admin/product/drafts (carte "CRUD Produits" du dashboard).
//
// RBAC (aligné sur GET /api/product/drafts) :
//   - Non authentifié → erreur AUTH_REQUIRED
//   - Level 1-3 (SUPER_ADMIN/ADMIN/MANAGER) → voit/gère tous les brouillons
//   - Level 4+ (EDITOR/SUPERVISOR/USER)     → uniquement ses propres produits
//
// Robustesse :
//   - Validation Zod sur chaque entrée (fieldErrors renvoyés au client)
//   - Slug/SKU garantis uniques (génération entropique + gestion P2002)
//   - Suppression douce des produits (isdeleted + deletedAt)
//   - Suppression de variant refusée si des commandes y sont rattachées
//   - Sérialisation Decimal/Date → JSON-safe pour les Client Components
// =============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUserFromProvider } from "@/lib/auth/session-provider";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { generateSlug } from "@/lib/utils/slug";
import { generateSKU } from "@/lib/utils/sku";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type DraftActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code:
        | "AUTH_REQUIRED"
        | "VALIDATION_ERROR"
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "CONFLICT"
        | "INTERNAL_ERROR";
      fieldErrors?: Record<string, string[]>;
    };

interface AuthContext {
  userId: string;
  level: number;
}

type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; result: DraftActionResult<never> };

// ═══════════════════════════════════════════
// SCHÉMAS ZOD
// ═══════════════════════════════════════════

const variantInputSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  attributes: z
    .record(z.string().trim().min(1).max(64), z.string().trim().min(1).max(200))
    .refine((v) => Object.keys(v).length > 0, "Au moins un attribut est requis"),
  priceOffset: z.number().int().optional(),
});

const createDraftSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(200),
  basePrice: z.number().nonnegative("Le prix doit être positif ou nul"),
  description: z.string().max(10000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  images: z.array(z.string().min(1)).max(20).optional(),
  videoUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  sku: z.string().trim().max(64).optional(),
  variants: z.array(variantInputSchema).max(50).optional(),
});

const updateDraftSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  basePrice: z.number().nonnegative().optional(),
  description: z.string().max(10000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  images: z.array(z.string().min(1)).max(20).optional(),
  videoUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

const listDraftsSchema = z.object({
  statuses: z.array(z.nativeEnum(ProductStatus)).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const createVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().trim().max(64).optional(),
  attributes: z
    .record(z.string().trim().min(1).max(64), z.string().trim().min(1).max(200))
    .refine((v) => Object.keys(v).length > 0, "Au moins un attribut est requis"),
  priceOffset: z.number().int().optional(),
});

const updateVariantSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  attributes: z
    .record(z.string().trim().min(1).max(64), z.string().trim().min(1).max(200))
    .optional(),
  priceOffset: z.number().int().optional(),
});

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUserFromProvider();
  if (!user) {
    return {
      ok: false,
      result: { success: false, error: "Authentification requise", code: "AUTH_REQUIRED" },
    };
  }
  return { ok: true, ctx: { userId: user.id, level: user.level } };
}

/** Level 1-3 : accès global ; Level 4+ : uniquement ses propres produits. */
function ownershipWhere(ctx: AuthContext): Prisma.ProductWhereInput {
  return ctx.level <= 3 ? {} : { userId: ctx.userId };
}

/** Sérialise un variant Prisma en objet JSON-safe. */
function serializeVariant(v: {
  id: string;
  productId: string;
  sku: string;
  attributes: Prisma.JsonValue;
  priceOffset: number;
  createdAt: Date;
}) {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    attributes: (v.attributes ?? {}) as Record<string, string>,
    priceOffset: v.priceOffset,
    createdAt: v.createdAt.toISOString(),
  };
}

/** Génère un couple slug/SKU garanti unique en base (avec retries). */
async function ensureUniqueIdentifiers(
  name: string,
  preferredSku?: string,
): Promise<{ slug: string; sku: string } | null> {
  const slug = generateSlug(name, { maxLength: 100, fallback: "produit" });

  // Slug : suffixe numérique si collision
  let finalSlug = slug;
  for (let i = 2; i <= 50; i++) {
    const exists = await prisma.product.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });
    if (!exists) break;
    finalSlug = `${slug}-${i}`;
  }

  // SKU : préférence utilisateur puis génération entropique
  const candidates: string[] = [];
  if (preferredSku) candidates.push(preferredSku);
  for (let i = 0; i < 5; i++) candidates.push(generateSKU(name));

  for (const sku of candidates) {
    const exists = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (!exists) return { slug: finalSlug, sku };
  }
  return null;
}

/** Convertit une erreur en résultat d'action typé. */
function toActionError(error: unknown): DraftActionResult<never> {
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      success: false,
      error: "Données invalides",
      code: "VALIDATION_ERROR",
      fieldErrors,
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return {
      success: false,
      error: "Conflit d'unicité (slug ou SKU déjà utilisé)",
      code: "CONFLICT",
    };
  }
  console.error("[PRODUCT_DRAFT_ACTIONS]", error);
  return {
    success: false,
    error: "Erreur serveur inattendue",
    code: "INTERNAL_ERROR",
  };
}

function revalidateDraftPaths(productId?: string) {
  revalidatePath("/admin/product/drafts");
  revalidatePath("/admin/product");
  revalidatePath("/products");
  if (productId) revalidatePath(`/products/${productId}`);
}


const DRAFT_STATUSES: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.PENDING,
  ProductStatus.SCHEDULED,
];

const draftSummarySelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  status: true,
  basePrice: true,
  price: true,
  currency: true,
  isActive: true,
  scheduledAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  images: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    select: {
      id: true,
      productId: true,
      sku: true,
      attributes: true,
      priceOffset: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

type DraftSummaryRaw = Prisma.ProductGetPayload<{ select: typeof draftSummarySelect }>;

/** Sérialise un produit (avec variants) en structure JSON-safe. */
function serializeDraftSummary(p: DraftSummaryRaw) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    status: p.status,
    basePrice: Number(p.basePrice),
    price: Number(p.price),
    currency: p.currency,
    isActive: p.isActive,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: p.images,
    category: p.category,
    variantCount: p._count.variants,
    variants: p.variants.map(serializeVariant),
  };
}

// ═══════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════

export async function createDraftProductAction(
  input: z.input<typeof createDraftSchema>,
): Promise<DraftActionResult<{ id: string; name: string }>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const parsed = createDraftSchema.safeParse(input);
    if (!parsed.success) return toActionError(parsed.error);
    const data = parsed.data;

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!category) {
        return {
          success: false,
          error: "Catégorie introuvable",
          code: "VALIDATION_ERROR",
          fieldErrors: { categoryId: ["Catégorie introuvable"] },
        };
      }
    }

    const ids = await ensureUniqueIdentifiers(data.name, data.sku);
    if (!ids) {
      return { success: false, error: "Impossible de générer un slug/SKU unique", code: "CONFLICT" };
    }

    const product = await prisma.product.create({
      data: {
        id: generateUUIDv7(),
        name: data.name,
        slug: ids.slug,
        sku: ids.sku,
        description: data.description ?? "",
        price: data.basePrice,
        basePrice: data.basePrice,
        categoryId: data.categoryId ?? null,
        userId: auth.ctx.userId,
        createdBy: auth.ctx.userId,
        updatedBy: auth.ctx.userId,
        status: ProductStatus.DRAFT,
        isActive: false,
        images: data.images ?? [],
        videoUrl: data.videoUrl ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        statusHistory: {
          create: {
            id: generateUUIDv7(),
            oldStatus: ProductStatus.DRAFT,
            newStatus: ProductStatus.DRAFT,
            reason: "Création du brouillon",
            changedById: auth.ctx.userId,
          },
        },
        variants: {
          create: (data.variants ?? []).map((v) => ({
            id: generateUUIDv7(),
            sku: v.sku || generateSKU(data.name),
            attributes: v.attributes,
            priceOffset: v.priceOffset ?? 0,
          })),
        },
      },
      select: { id: true, name: true },
    });

    revalidateDraftPaths(product.id);

    return {
      success: true,
      data: product,
      message: `Brouillon "${product.name}" créé avec ${data.variants?.length ?? 0} variant(s)`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// READ — LIST
// ═══════════════════════════════════════════

export async function listDraftProductsAction(
  input: z.input<typeof listDraftsSchema> = {},
): Promise<
  DraftActionResult<{
    products: ReturnType<typeof serializeDraftSummary>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>
> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const parsed = listDraftsSchema.safeParse(input);
    if (!parsed.success) return toActionError(parsed.error);
    const { statuses, search, page = 1, limit = 20 } = parsed.data;

    const where: Prisma.ProductWhereInput = {
      status: { in: statuses?.length ? statuses : DRAFT_STATUSES },
      isdeleted: false,
      ...ownershipWhere(auth.ctx),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: draftSummarySelect,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        products: products.map(serializeDraftSummary),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// READ — DETAIL
// ═══════════════════════════════════════════

export async function getDraftProductAction(
  productId: string,
): Promise<DraftActionResult<ReturnType<typeof serializeDraftSummary>>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const product = await prisma.product.findFirst({
      where: { id: productId, isdeleted: false, ...ownershipWhere(auth.ctx) },
      select: draftSummarySelect,
    });
    if (!product) {
      return { success: false, error: "Brouillon non trouvé", code: "NOT_FOUND" };
    }

    return { success: true, data: serializeDraftSummary(product) };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════

export async function updateDraftProductAction(
  productId: string,
  input: z.input<typeof updateDraftSchema>,
): Promise<DraftActionResult<{ id: string; name: string }>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const parsed = updateDraftSchema.safeParse(input);
    if (!parsed.success) return toActionError(parsed.error);
    const data = parsed.data;

    if (Object.keys(data).length === 0) {
      return { success: false, error: "Aucune modification fournie", code: "VALIDATION_ERROR" };
    }

    const existing = await prisma.product.findFirst({
      where: { id: productId, isdeleted: false, ...ownershipWhere(auth.ctx) },
      select: { id: true, name: true },
    });
    if (!existing) {
      return { success: false, error: "Brouillon non trouvé", code: "NOT_FOUND" };
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!category) {
        return {
          success: false,
          error: "Catégorie introuvable",
          code: "VALIDATION_ERROR",
          fieldErrors: { categoryId: ["Catégorie introuvable"] },
        };
      }
    }

    // Si le prix de base change et que price n'était pas personnalisé, on l'aligne.
    const previous = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, basePrice: true },
    });
    const alignPrice =
      data.basePrice !== undefined &&
      previous &&
      previous.price.equals(previous.basePrice)
        ? data.basePrice
        : undefined;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        ...(data.description === null || data.description === undefined
          ? { description: undefined }
          : {}),
        ...(alignPrice !== undefined ? { price: alignPrice } : {}),
        updatedBy: auth.ctx.userId,
      },
      select: { id: true, name: true },
    });

    revalidateDraftPaths(productId);

    return {
      success: true,
      data: updated,
      message: `Brouillon "${updated.name}" mis à jour`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// DELETE (doux)
// ═══════════════════════════════════════════

export async function deleteDraftProductAction(
  productId: string,
): Promise<DraftActionResult<{ deleted: true }>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const product = await prisma.product.findFirst({
      where: { id: productId, isdeleted: false, ...ownershipWhere(auth.ctx) },
      select: { id: true, name: true, status: true },
    });
    if (!product) {
      return { success: false, error: "Brouillon non trouvé", code: "NOT_FOUND" };
    }

    // Seuls les niveaux 1-3 peuvent supprimer un produit publié/actif.
    if (auth.ctx.level > 3 && (product.status === "PUBLISHED" || product.status === "ACTIVE")) {
      return {
        success: false,
        error: "Seuls les gestionnaires peuvent supprimer un produit publié",
        code: "FORBIDDEN",
      };
    }

    // Suppression douce : préservation de l'historique et des commandes liées.
    await prisma.product.update({
      where: { id: productId },
      data: {
        isdeleted: true,
        deletedAt: new Date(),
        isActive: false,
        isArchived: true,
        updatedBy: auth.ctx.userId,
        statusHistory: {
          create: {
            id: generateUUIDv7(),
            oldStatus: product.status,
            newStatus: ProductStatus.ARCHIVED,
            reason: "Suppression du brouillon",
            changedById: auth.ctx.userId,
          },
        },
      },
    });

    revalidateDraftPaths(productId);

    return {
      success: true,
      data: { deleted: true },
      message: `Brouillon "${product.name}" supprimé`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// DUPLICATE
// ═══════════════════════════════════════════

export async function duplicateDraftProductAction(
  productId: string,
): Promise<DraftActionResult<{ id: string; name: string }>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const source = await prisma.product.findFirst({
      where: { id: productId, isdeleted: false, ...ownershipWhere(auth.ctx) },
      include: {
        productImages: { orderBy: { position: "asc" as const } },
        variants: true,
      },
    });
    if (!source) {
      return { success: false, error: "Brouillon non trouvé", code: "NOT_FOUND" };
    }

    const newName = `${source.name} (copie)`;
    const ids = await ensureUniqueIdentifiers(newName);
    if (!ids) {
      return {
        success: false,
        error: "Impossible de générer un slug/SKU unique pour la copie",
        code: "CONFLICT",
      };
    }

    const copy = await prisma.product.create({
      data: {
        id: generateUUIDv7(),
        name: newName,
        slug: ids.slug,
        sku: ids.sku,
        description: source.description,
        price: source.price,
        basePrice: source.basePrice,
        currency: source.currency,
        categoryId: source.categoryId,
        userId: auth.ctx.userId,
        createdBy: auth.ctx.userId,
        updatedBy: auth.ctx.userId,
        status: ProductStatus.DRAFT,
        isActive: false,
        images: source.images,
        videoUrl: source.videoUrl,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        taxClassId: source.taxClassId,
        productImages: {
          create: source.productImages.map((img, index) => ({
            url: img.url,
            alt: img.alt,
            position: index,
          })),
        },
        variants: {
          create: source.variants.map((v) => ({
            id: generateUUIDv7(),
            sku: generateSKU(v.sku || source.name),
            attributes: v.attributes,
            priceOffset: v.priceOffset,
          })),
        },
      },
      select: { id: true, name: true },
    });

    revalidateDraftPaths(copy.id);

    return {
      success: true,
      data: copy,
      message: `Copie créée : "${copy.name}"`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// VARIANTS — CREATE
// ═══════════════════════════════════════════

export async function createVariantAction(
  input: z.input<typeof createVariantSchema>,
): Promise<DraftActionResult<ReturnType<typeof serializeVariant>>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const parsed = createVariantSchema.safeParse(input);
    if (!parsed.success) return toActionError(parsed.error);
    const { productId, ...data } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, isdeleted: false, ...ownershipWhere(auth.ctx) },
      select: { id: true, name: true, _count: { select: { variants: true } } },
    });
    if (!product) {
      return { success: false, error: "Produit non trouvé", code: "NOT_FOUND" };
    }
    if (product._count.variants >= 50) {
      return { success: false, error: "Limite de 50 variants par produit atteinte", code: "CONFLICT" };
    }

    // SKU variant : préférence utilisateur puis génération, avec unicité.
    let sku = data.sku || generateSKU(product.name);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) break;
      if (data.sku) {
        return {
          success: false,
          error: "Ce SKU de variante est déjà utilisé",
          code: "CONFLICT",
          fieldErrors: { sku: ["SKU déjà utilisé"] },
        };
      }
      sku = generateSKU(product.name);
    }

    const variant = await prisma.productVariant.create({
      data: {
        id: generateUUIDv7(),
        productId,
        sku,
        attributes: data.attributes,
        priceOffset: data.priceOffset ?? 0,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { updatedBy: auth.ctx.userId },
    });

    revalidateDraftPaths(productId);

    return {
      success: true,
      data: serializeVariant(variant),
      message: `Variante "${sku}" ajoutée`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// VARIANTS — UPDATE
// ═══════════════════════════════════════════

export async function updateVariantAction(
  variantId: string,
  input: z.input<typeof updateVariantSchema>,
): Promise<DraftActionResult<ReturnType<typeof serializeVariant>>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const parsed = updateVariantSchema.safeParse(input);
    if (!parsed.success) return toActionError(parsed.error);
    const data = parsed.data;

    if (Object.keys(data).length === 0) {
      return { success: false, error: "Aucune modification fournie", code: "VALIDATION_ERROR" };
    }

    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { isdeleted: false, ...ownershipWhere(auth.ctx) },
      },
      include: { product: { select: { id: true } } },
    });
    if (!variant) {
      return { success: false, error: "Variante non trouvée", code: "NOT_FOUND" };
    }

    if (data.sku && data.sku !== variant.sku) {
      const exists = await prisma.productVariant.findUnique({
        where: { sku: data.sku },
        select: { id: true },
      });
      if (exists) {
        return {
          success: false,
          error: "Ce SKU de variante est déjà utilisé",
          code: "CONFLICT",
          fieldErrors: { sku: ["SKU déjà utilisé"] },
        };
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.attributes !== undefined ? { attributes: data.attributes } : {}),
        ...(data.priceOffset !== undefined ? { priceOffset: data.priceOffset } : {}),
      },
    });

    await prisma.product.update({
      where: { id: variant.productId },
      data: { updatedBy: auth.ctx.userId },
    });

    revalidateDraftPaths(variant.productId);

    return {
      success: true,
      data: serializeVariant(updated),
      message: `Variante "${updated.sku}" mise à jour`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

// ═══════════════════════════════════════════
// VARIANTS — DELETE
// ═══════════════════════════════════════════

export async function deleteVariantAction(
  variantId: string,
): Promise<DraftActionResult<{ deleted: true }>> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.result;

    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { isdeleted: false, ...ownershipWhere(auth.ctx) },
      },
      select: {
        id: true,
        sku: true,
        productId: true,
        _count: { select: { orderItems: true, cartItems: true } },
      },
    });
    if (!variant) {
      return { success: false, error: "Variante non trouvée", code: "NOT_FOUND" };
    }

    // La variante n'a pas de soft-delete : on refuse la suppression si elle
    // est référencée par des commandes (intégrité de l'historique commercial).
    if (variant._count.orderItems > 0) {
      return {
        success: false,
        error: `Impossible de supprimer : ${variant._count.orderItems} commande(s) rattachée(s) à cette variante`,
        code: "CONFLICT",
      };
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { variantId } }),
      prisma.productVariant.delete({ where: { id: variantId } }),
      prisma.product.update({
        where: { id: variant.productId },
        data: { updatedBy: auth.ctx.userId },
      }),
    ]);

    revalidateDraftPaths(variant.productId);

    return {
      success: true,
      data: { deleted: true },
      message: `Variante "${variant.sku}" supprimée`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
