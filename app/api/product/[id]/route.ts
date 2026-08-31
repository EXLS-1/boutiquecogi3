// app/api/products/[id]/route.ts
// Ce fichier gère les routes API pour un produit spécifique identifié par son ID, slug ou SKU.
// Il permet de récupérer les détails d'un produit (GET), de mettre à jour un produit (PUT) et de supprimer un produit (DELETE).
// La route GET supporte la recherche par ID, slug ou SKU pour plus de flexibilité dans l'accès aux produits. Les mises à jour et suppressions sont basées sur l'ID du produit trouvé.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function findProduct(id: string) {
  return prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }, { variants: { some: { sku: id } } }],
      isArchived: false,
    },
    include: {
      category: { select: { slug: true, name: true } },
      categoryProducts: {
        orderBy: { displayOrder: "asc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
      variants: { take: 1 },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await findProduct(id);

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: product.variants[0]?.sku ?? product.id,
        name: product.name,
        description: product.description,
        price: Math.round(Number(product.basePrice) / 100),
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
    const requestedIds: string[] = Array.isArray(body.categoryIds)
      ? body.categoryIds.map(String).filter(Boolean)
      : body.categoryId
        ? [String(body.categoryId)]
        : [];

    let categories: { id: string }[] = [];
    if (categoryProvided) {
      if (requestedIds.length > 10) {
        return NextResponse.json(
          { status: "error", message: "10 catégories maximum" },
          { status: 400 },
        );
      }
      categories = requestedIds.length
        ? await prisma.category.findMany({
            where: { id: { in: requestedIds } },
            select: { id: true },
          })
        : [];
      if (categories.length !== requestedIds.length) {
        return NextResponse.json(
          {
            status: "error",
            message: "Une ou plusieurs catégories sont introuvables",
            missing: requestedIds.filter(
              (id) => !categories.some((c) => c.id === id),
            ),
          },
          { status: 400 },
        );
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      if (categoryProvided) {
        // Remplacement complet : jointure + catégorie principale = première
        await tx.categoryProduct.deleteMany({ where: { productId: existing.id } });
        if (categories.length > 0) {
          await tx.categoryProduct.createMany({
            data: categories.map((c, index) => ({
              productId: existing.id,
              categoryId: c.id,
              displayOrder: index,
            })),
          });
        }
        data.categoryId = categories[0]?.id ?? null;
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
