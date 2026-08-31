// app/api/products/route.ts
// Ce fichier gère les routes API pour les produits. Il permet de récupérer la liste des produits avec des filtres et de créer de nouveaux produits.
// La route GET /api/products supporte la pagination, les filtres par catégorie, recherche textuelle, produits en vedette et filtrage par prix.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import { generateUUIDv7 } from "@/lib/utils/uuid";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

interface ProductFilters {
  category?: string;
  search?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

function buildWhereClause(filters: ProductFilters) {
  const where: {
    isArchived: boolean;
    isFeatured?: boolean;
    category?: { slug: string };
    OR?: Array<{ name?: object; description?: object }>;
    basePrice?: { gte?: number; lte?: number };
  } = { isArchived: false };

  if (filters.category && filters.category !== "all") {
    where.category = { slug: filters.category };
  }

  if (filters.isFeatured !== undefined) {
    where.isFeatured = filters.isFeatured;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = {};
    if (filters.minPrice !== undefined) {
      where.basePrice.gte = Math.round(filters.minPrice * 100);
    }
    if (filters.maxPrice !== undefined) {
      where.basePrice.lte = Math.round(filters.maxPrice * 100);
    }
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10),
      ),
    );
    const skip = (page - 1) * limit;

    const filters: ProductFilters = {
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      isFeatured: searchParams.get("isFeatured") === "true" ? true : undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
    };

    const where = buildWhereClause(filters);
    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        category: { select: { slug: true, name: true } },
        categoryProducts: {
          orderBy: { displayOrder: "asc" },
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        variants: true,
      },
    });

    // Prisma renvoie `Decimal` pour les champs numériques (basePrice).
    // On évite un typage strict `number` pour supprimer l'erreur TS.
    type Product = {
      id: string;
      name: string;
      description: string | null;
      basePrice: unknown; // Prisma.Decimal
      images: string[] | null;
      category?: { slug?: string } | null;
      categoryProducts?: Array<{ category: { id: string; name: string; slug: string } }> | null;
      isFeatured: boolean;
      createdAt: Date;
      updatedAt: Date;
      variants?: Array<{ sku?: string }> | null;
    };


    return NextResponse.json({
      status: "success",
      data: {
        products: products.map((p: Product) => ({
          id: p.variants?.[0]?.sku ?? p.id,
          name: p.name,
          description: p.description,
          // Ensure Prisma Decimal from Prisma is converted to number
          price: Math.round(Number(p.basePrice) / 100),

          images: p.images ?? [],
          category: p.category?.slug ?? "femme",
          categories: (p.categoryProducts ?? []).map((cp) => ({
            id: cp.category.id,
            name: cp.category.name,
            slug: cp.category.slug,
          })),
          isFeatured: p.isFeatured,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, images, category, categoryId, categoryIds, isFeatured } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Name is required" },
        { status: 400 },
      );
    }

    // ── Résolution des catégories (multi prioritaire, slug/UUID rétrocompatibles) ──
    const requestedIds: string[] = Array.isArray(categoryIds)
      ? categoryIds.map(String).filter(Boolean)
      : categoryId
        ? [String(categoryId)]
        : [];

    let categories = requestedIds.length
      ? await prisma.category.findMany({ where: { id: { in: requestedIds } } })
      : [];

    if (requestedIds.length > 0 && categories.length !== requestedIds.length) {
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

    // Fallback slug (rétrocompatibilité « category: "femme" »)
    if (categories.length === 0 && category) {
      const slugCategory = await prisma.category.findFirst({
        where: { slug: String(category) },
      });
      if (slugCategory) categories = [slugCategory];
    }

    const slug = slugify(`${name}-${Date.now()}`);
    const basePrice = Math.round(Number(price) * 100);

    const product = await prisma.product.create({
      data: {
        id: generateUUIDv7(),
        name: name.trim(),
        slug,
        description: String(description || ""),
        basePrice,
        images: Array.isArray(images) ? images : [],
        ...(categories.length > 0
          ? {
              categoryId: categories[0].id,
              categoryProducts: {
                create: categories.map((c, index) => ({
                  categoryId: c.id,
                  displayOrder: index,
                })),
              },
            }
          : {}),
        isFeatured: isFeatured === true,
        variants: {
          create: {
            id: generateUUIDv7(),
            sku: slug,
            attributes: {},
            priceOffset: 0,
          },
        },
      } as Prisma.ProductCreateInput,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        categoryProducts: {
          orderBy: { displayOrder: "asc" },
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        variants: true,
      },
    });


    return NextResponse.json(
      { status: "success", data: product },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to create product" },
      { status: 500 },
    );
  }
}
