// app/api/product/import/route.ts
// =============================================================================
// API — Import massif de produits via CSV
// =============================================================================
// Reçoit un fichier CSV multipart, parse le contenu, télécharge les images
// distantes vers Supabase (optionnel), vérifie les SKU, gère les catégories,
// et insère tous les produits dans une transaction atomique.
//
// RBAC : Consulte le header Authorization (validé par le middleware).
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProductsCsv } from "@/lib/csv/import-parser";
import { batchUploadRemoteImages } from "@/lib/images/remote-uploader";
import { slugify } from "@/lib/utils/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/product/import
 * Body : FormData avec champ `file` (CSV) et `uploadImages` (optionnel)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse du FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadImages = formData.get("uploadImages") === "true";

    // 2. Validation du fichier
    if (!file) {
      return NextResponse.json(
        { error: "Fichier CSV requis" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 2MB)`,
        },
        { status: 400 },
      );
    }

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Le fichier doit être au format CSV" },
        { status: 400 },
      );
    }

    // 3. Lecture et parsing du CSV
    const csvContent = await file.text();
    const { products, errors: parseErrors } = parseProductsCsv(csvContent);

    if (parseErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Erreurs de parsing dans le CSV",
          details: parseErrors.slice(0, 50),
          totalErrors: parseErrors.length,
        },
        { status: 400 },
      );
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit valide trouvé dans le CSV" },
        { status: 400 },
      );
    }

    // 4. Upload automatique des images distantes
    let uploadedImagesCount = 0;
    const failedImages: string[] = [];

    if (uploadImages) {
      const allImageUrls = [
        ...new Set(products.flatMap((p) => p.imageUrls)),
      ].filter((url) => url.startsWith("http"));

      if (allImageUrls.length > 0) {
        const uploadResults = await batchUploadRemoteImages(
          allImageUrls,
          "bulk-import",
        );

        const urlMap = new Map<string, string>();
        uploadResults.forEach((res) => {
          if (res.supabaseUrl) {
            urlMap.set(res.originalUrl, res.supabaseUrl);
            uploadedImagesCount++;
          } else {
            failedImages.push(res.originalUrl);
          }
        });

        // Remplacement des URLs dans les produits
        products.forEach((product) => {
          product.imageUrls = product.imageUrls.map(
            (url) => urlMap.get(url) || url,
          );
        });
      }
    }

    // 5. Vérification des SKU (doublons avec la base)
    const allSkus = [
      ...products.map((p) => p.sku),
      ...products.flatMap((p) => p.variants.map((v) => v.sku)),
    ];

    const existingProducts = await prisma.product.findMany({
      where: { sku: { in: allSkus } },
      select: { sku: true },
    });

    const existingVariants = await prisma.productVariant.findMany({
      where: { sku: { in: allSkus } },
      select: { sku: true },
    });

    const conflictSkus = new Set([
      ...existingProducts.map((p) => p.sku),
      ...existingVariants.map((v) => v.sku),
    ]);

    if (conflictSkus.size > 0) {
      return NextResponse.json(
        {
          error: "Conflits de SKU détectés avec la base existante",
          conflictingSkus: Array.from(conflictSkus),
        },
        { status: 409 },
      );
    }

    // 6. Gestion des catégories
    const categoryNames = [
      ...new Set(products.map((p) => p.categoryName).filter(Boolean)),
    ] as string[];

    const existingCategories = await prisma.category.findMany({
      where: { name: { in: categoryNames } },
    });
    const categoryMap = new Map(existingCategories.map((c) => [c.name, c.id]));

    const missingCategories = categoryNames.filter((n) => !categoryMap.has(n));
    if (missingCategories.length > 0) {
      await prisma.category.createMany({
        data: missingCategories.map((name) => ({
          name,
          slug: slugify(name),
          subtitle: name,
          OrderBy: "name",
        })),
        skipDuplicates: true,
      });
      const newCategories = await prisma.category.findMany({
        where: { name: { in: missingCategories } },
      });
      newCategories.forEach((c) => categoryMap.set(c.name, c.id));
    }

    // 7. Transaction atomique d'insertion
    const results = await prisma.$transaction(
      async (tx) => {
        const created = [];

        for (const product of products) {
          // Génération du slug unique
          let slug = slugify(product.name);
          let counter = 1;
          while (
            await tx.product.findUnique({
              where: { slug },
              select: { id: true },
            })
          ) {
            slug = `${slugify(product.name)}-${counter++}`;
          }

          const status = product.isActive ? "ACTIVE" : "DRAFT";

          const createdProduct = await tx.product.create({
            data: {
              name: product.name,
              slug,
              sku: product.sku,
              description: product.description || "",
              price: product.basePrice,
              basePrice: product.basePrice,
              status,
              isActive: product.isActive,
              isArchived: false,
              isdeleted: false,
              publishedAt: product.isActive ? new Date() : null,
              scheduledAt: null,
              userId: "00000000-0000-7000-8000-000000000000", // Placeholder système
              categoryId: product.categoryName
                ? categoryMap.get(product.categoryName)
                : null,
              images: product.imageUrls,
              productImages: {
                create: product.imageUrls.map((url, i) => ({
                  url,
                  alt: `${product.name} - ${i + 1}`,
                  position: i,
                })),
              },
              variants:
                product.variants.length > 0
                  ? {
                      create: product.variants.map((v) => ({
                        sku: v.sku,
                        attributes: v.options,
                        priceOffset: Math.round(v.priceDiff * 100),
                      })),
                    }
                  : {
                      create: {
                        sku: product.sku,
                        attributes: {},
                        priceOffset: 0,
                      },
                    },
            },
            select: { id: true, sku: true, name: true, slug: true },
          });

          created.push(createdProduct);
        }

        return created;
      },
      {
        isolationLevel: "Serializable",
        maxWait: 20000,
        timeout: 60000,
      },
    );

    return NextResponse.json(
      {
        success: true,
        imported: results.length,
        imagesProcessed: uploadedImagesCount,
        failedImages,
        products: results,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[PRODUCT_IMPORT]", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'import" },
      { status: 500 },
    );
  }
}
