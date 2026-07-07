// app/api/products/route.ts
// Ce fichier gère les routes API pour les produits. Il permet de récupérer la liste des produits avec des filtres et de créer de nouveaux produits.
// La route GET /api/products supporte la pagination, les filtres par catégorie, recherche textuelle, produits en vedette et filtrage par prix.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";
import { generateUUIDv7 } from "@/lib/uuid";

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
        variants: true,
      },
    });

    type Product = {
      id: string;
      name: string;
      description: string | null;
      basePrice: number;
      images: string[] | null;
      category?: { slug?: string } | null;
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
          price: Math.round(p.basePrice / 100),
          images: p.images ?? [],
          category: p.category?.slug ?? "femme",
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
    const { name, description, price, images, category, isFeatured } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Name is required" },
        { status: 400 },
      );
    }

    const categoryRecord = await prisma.category.findFirst({
      where: { slug: String(category || "femme") },
    });

    const slug = slugify(`${name}-${Date.now()}`);
    const basePrice = Math.round(parseFloat(price) * 100);

    const product = await prisma.product.create({
      data: {
        id: generateUUIDv7(),
        name: name.trim(),
        slug,
        description: String(description || ""),
        basePrice,
        images: Array.isArray(images) ? images : [],
        ...(categoryRecord
          ? { category: { connect: { id: categoryRecord.id } } }
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
      include: { category: true, variants: true },
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
