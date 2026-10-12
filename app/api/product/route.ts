// app/api/products/route.ts
// Ce fichier gère les routes API pour les produits. Il permet de récupérer la liste des produits avec des filtres et de créer de nouveaux produits.
// La route GET /api/products supporte la pagination, les filtres par catégorie, recherche textuelle, produits en vedette et filtrage par prix.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ProductServiceError } from "@/server/services/product-service-error";
import { normalizeCategoryIds, validateCategoriesExist } from "@/server/services/product-category-sync";

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
    productPrice?: { some: { amount: { gte?: number; lte?: number } } };
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
    // Le prix vit dans la grille `productPrice` (montant en centimes).
    where.productPrice = {
      some: {
        amount: {
          ...(filters.minPrice !== undefined ? { gte: Math.round(filters.minPrice * 100) } : {}),
          ...(filters.maxPrice !== undefined ? { lte: Math.round(filters.maxPrice * 100) } : {}),
        },
      },
    };
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
        productPrice: {
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { amount: true },
        },
      },
    });

    // Le prix n'est plus un scalaire `basePrice` : il vit dans la grille
    // `productPrice` (montant en centimes). On convertit en unités majeures.
    return NextResponse.json({
      status: "success",
      data: {
        products: products.map((p) => ({
          id: p.variants?.[0]?.sku ?? p.id,
          name: p.name,
          description: p.description,
          price: Math.round(Number(p.productPrice?.[0]?.amount ?? 0) / 100),

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
    // UUID normalisés (trim/casse), catégories supprimées refusées, invariant
    // categoryId = categoryIds[0] garanti par le helper partagé.
    let categories: Awaited<ReturnType<typeof validateCategoriesExist>> = [];
    try {
      const requestedIds = normalizeCategoryIds(categoryId, categoryIds);
      categories = await validateCategoriesExist(prisma, requestedIds);
      // Fallback slug (rétrocompatibilité « category: "femme" »)
      if (categories.length === 0 && category) {
        const slugCategory = await prisma.category.findFirst({
          where: { slug: String(category), deletedAt: null },
        });
        if (slugCategory) categories = [slugCategory];
      }
    } catch (error) {
      if (error instanceof ProductServiceError) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 400 });
      }
      throw error;
    }

    const slug = slugify(`${name}-${Date.now()}`);
    const basePrice = Math.round(Number(price) * 100);

    // Type de produit obligatoire (`productTypeId` NOT NULL) : on retombe sur
    // le type par défaut actif, comme l'import.
    const defaultProductType = await prisma.productTypeConfig.findFirst({
      where: { isDefault: true, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }) ?? await prisma.productTypeConfig.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!defaultProductType) {
      return NextResponse.json(
        { status: "error", message: "Aucun type de produit actif n'est configuré." },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        id: generateUUIDv7(),
        name: name.trim(),
        slug,
        sku: slug,
        description: String(description || ""),
        productTypeId: defaultProductType.id,
        productPrice: {
          create: { currency: "USD", amount: basePrice },
        },
        images: Array.isArray(images) ? images : [],
        // `Product.userId` est requis : cette route d'administration n'expose pas
        // de session, on retombe donc sur le compte système (comme l'import).
        userId: "00000000-0000-7000-8000-000000000000",
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
      },
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
