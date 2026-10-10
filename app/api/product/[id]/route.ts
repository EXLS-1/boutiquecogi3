// app/api/products/[id]/route.ts
// Ce fichier gère les routes API pour un produit spécifique identifié par son ID, slug ou SKU.
// Il permet de récupérer les détails d'un produit (GET), de mettre à jour un produit (PUT) et de supprimer un produit (DELETE).
// La route GET supporte la recherche par ID, slug ou SKU pour plus de flexibilité dans l'accès aux produits. Les mises à jour et suppressions sont basées sur l'ID du produit trouvé.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductServiceError } from "@/lib/product/product-errors";
import { normalizeCategoryIds, syncProductCategories } from "@/server/services/product-category-sync";
import { getCurrentUserFromProvider } from "@/lib/auth/session-provider";
import { serializeDecimal } from "@/lib/product-catalog/catalog-types";
import { z } from "zod";

const productIdSchema = z.string().min(1).max(128);

async function findProduct(id: string) {
  const trimmed = id.trim();
  if (!trimmed) return null;
  return prisma.product.findFirst({
    where: {
      OR: [{ id: trimmed }, { slug: trimmed }, { variants: { some: { sku: trimmed } } }],
      isArchived: false,
      isdeleted: false,
    },
    include: {
      category: { select: { slug: true, name: true } },
      categoryProducts: {
        orderBy: { displayOrder: "asc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
      variants: { take: 1 },
      productPrice: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { amount: true },
      },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const parsedId = productIdSchema.safeParse(rawId?.trim());
    if (!parsedId.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid product identifier" },
        { status: 400 },
      );
    }
    const product = await findProduct(parsedId.data);

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    const priceCents = product.productPrice[0]?.amount ?? 0;

    return NextResponse.json({
      status: "success",
      data: {
        id: product.variants[0]?.sku ?? product.id,
        name: product.name,
        description: product.description,
        price: serializeDecimal(priceCents) / 100,
        images: product.images,
        category: product.category?.slug ?? "femme",
        categories: product.categoryProducts.map((cp) => ({
          id: cp.category.id,
          name: cp.category.name,
          slug: cp.category.slug,
        })),
        isFeatured: product.isFeatured,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await findProduct(id);

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data: {
      name?: string;
      description?: string;
      basePrice?: number;
      images?: string[];
      isFeatured?: boolean;
      isArchived?: boolean;
      categoryId?: string | null;
    } = {};

    if (body.name) data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = String(body.description);
    if (body.price !== undefined)
      data.basePrice = Math.round(parseFloat(body.price) * 100);
    if (Array.isArray(body.images)) data.images = body.images;
    if (body.isFeatured !== undefined)
      data.isFeatured = Boolean(body.isFeatured);
    if (body.isArchived !== undefined)
      data.isArchived = Boolean(body.isArchived);

    // ── Catégories : categoryId (principale) et/ou categoryIds (multi) ──
    const categoryProvided =
      body.categoryId !== undefined || body.categoryIds !== undefined;

    const categoryIds = normalizeCategoryIds(body.categoryId, body.categoryIds);

    const product = await prisma.$transaction(async (tx) => {
      if (categoryProvided) {
        // Remplacement complet via le helper partagé (ordre + principale = première)
        await syncProductCategories(tx, existing.id, categoryIds);
      }

      return tx.product.update({
        where: { id: existing.id },
        data,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          categoryProducts: {
            orderBy: { displayOrder: "asc" },
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
          variants: true,
        },
      });
    });

    return NextResponse.json({ status: "success", data: product });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return NextResponse.json(
        { status: "error", code: error.code, message: error.message },
        { status: 400 },
      );
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await findProduct(id);

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: { isArchived: true },
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete product" },
      { status: 500 },
    );
  }
}
