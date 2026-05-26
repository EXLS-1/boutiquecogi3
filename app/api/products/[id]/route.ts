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
        price: Math.round(product.basePrice / 100),
        images: product.images,
        category: product.category?.slug ?? "femme",
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

    const product = await prisma.product.update({
      where: { id: existing.id },
      data,
      include: { category: true, variants: true },
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
