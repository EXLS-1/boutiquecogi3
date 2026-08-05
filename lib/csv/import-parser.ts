// lib/csv/import-parser.ts
// =============================================================================
// IMPORT CSV PRODUIT — Parser + Agrégateur + Validation Zod + Template
// =============================================================================
// Parse un CSV produit (avec support variantes multi-lignes), agrège
// les lignes par SKU parent, valide chaque champ via Zod, et génère
// une liste de produits prête pour l'import en base.
// =============================================================================

import Papa from "papaparse";
import { z } from "zod";
import { slugify } from "@/lib/utils/slug";

// ─── Types exportés ──────────────────────────────────────────────────────────

export interface CsvParseError {
  row: number;
  field?: string;
  message: string;
  raw: Record<string, string>;
}

export interface ParsedProduct {
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  categoryName?: string;
  tags: string[];
  isActive: boolean;
  imageUrls: string[];
  variants: Array<{
    sku: string;
    name: string;
    priceDiff: number;
    stock: number;
    options: Record<string, string>;
  }>;
}

export interface ParseResult {
  products: ParsedProduct[];
  errors: CsvParseError[];
  totalRows: number;
}

// ─── Validation Zod pour chaque ligne CSV ────────────────────────────────────

export const csvProductRowSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  basePrice: z.coerce.number().positive().max(9999999),
  compareAtPrice: z.coerce.number().positive().optional().or(z.literal("")),
  sku: z.string().min(2).max(50),
  stock: z.coerce.number().int().min(0).default(0),
  categoryName: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(false),
  imageUrls: z.string().min(1),
  variantSku: z.string().optional().or(z.literal("")),
  variantName: z.string().optional().or(z.literal("")),
  variantPriceDiff: z.coerce.number().default(0),
  variantStock: z.coerce.number().int().min(0).default(0),
  variantOptions: z.string().optional().or(z.literal("")),
});

export type CsvProductRow = z.infer<typeof csvProductRowSchema>;

// ─── Parser principal ────────────────────────────────────────────────────────

/**
 * Parse un contenu CSV en produits agrégés.
 * Le parsing est fait côté client/serveur avec PapaParse (streaming possible).
 */
export function parseProductsCsv(csvContent: string): ParseResult {
  const parseResult = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) =>
      header.trim().toLowerCase().replace(/\s+/g, ""),
  });

  if (parseResult.errors.length > 0) {
    const errors: CsvParseError[] = parseResult.errors.map((e) => ({
      row: e.row ?? 0,
      message: e.message,
      raw: {},
    }));
    return { products: [], errors, totalRows: 0 };
  }

  const errors: CsvParseError[] = [];
  const productMap = new Map<string, ParsedProduct>(); // key = SKU parent

  parseResult.data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 pour le header (1-based)

    // Mapping flexible des colonnes
    const mappedRow = {
      name: row["name"] || row["nom"] || row["productname"] || "",
      description: row["description"] || row["desc"] || "",
      basePrice: row["baseprice"] || row["price"] || row["prix"] || "",
      compareAtPrice:
        row["compareatprice"] || row["oldprice"] || row["ancienprix"] || "",
      sku: row["sku"] || row["reference"] || "",
      stock: row["stock"] || row["quantity"] || "0",
      categoryName: row["category"] || row["categorie"] || row["cat"] || "",
      tags: row["tags"] || row["tag"] || "",
      isActive: row["isactive"] || row["active"] || "false",
      imageUrls: row["images"] || row["imageurls"] || row["photos"] || "",
      variantSku: row["variantsku"] || row["vsku"] || "",
      variantName: row["variantname"] || row["vname"] || "",
      variantPriceDiff: row["variantpricediff"] || row["vdiff"] || "0",
      variantStock: row["variantstock"] || row["vstock"] || "0",
      variantOptions: row["variantoptions"] || row["voptions"] || "",
    };

    // Validation Zod
    const zodResult = csvProductRowSchema.safeParse(mappedRow);

    if (!zodResult.success) {
      zodResult.error.issues.forEach((issue) => {
        errors.push({
          row: rowNumber,
          field: issue.path.join("."),
          message: issue.message,
          raw: row,
        });
      });
      return;
    }

    const data = zodResult.data;
    const parentSku = data.sku;

    // Parse URLs d'images séparées par | ou ,
    const urls = data.imageUrls
      .split(/[|,]/)
      .map((u) => u.trim())
      .filter(Boolean);

    // Parse tags séparés par , ou ;
    const tags = data.tags
      ? data.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : [];

    // Parse options variante : JSON ou "key:value,key2:value2"
    let variantOptions: Record<string, string> = {};
    if (data.variantOptions) {
      try {
        variantOptions = JSON.parse(data.variantOptions);
      } catch {
        data.variantOptions.split(",").forEach((pair) => {
          const [key, value] = pair.split(":").map((s) => s.trim());
          if (key && value) variantOptions[key] = value;
        });
      }
    }

    // Si le produit parent n'existe pas encore, le créer
    if (!productMap.has(parentSku)) {
      productMap.set(parentSku, {
        name: data.name,
        slug: slugify(data.name),
        description: data.description || undefined,
        basePrice: data.basePrice,
        compareAtPrice: data.compareAtPrice || undefined,
        sku: data.sku,
        stock: data.stock,
        categoryName: data.categoryName || undefined,
        tags,
        isActive: data.isActive,
        imageUrls: urls,
        variants: [],
      });
    }

    // Si la ligne contient une variante, l'ajouter au produit parent
    if (data.variantSku) {
      const product = productMap.get(parentSku)!;
      product.variants.push({
        sku: data.variantSku,
        name: data.variantName || data.variantSku,
        priceDiff: data.variantPriceDiff,
        stock: data.variantStock,
        options: variantOptions,
      });
      // Le stock parent = somme des stocks variantes
      product.stock += data.variantStock;
    }
  });

  return {
    products: Array.from(productMap.values()),
    errors,
    totalRows: parseResult.data.length,
  };
}

// ─── Template CSV téléchargeable ─────────────────────────────────────────────

export const CSV_TEMPLATE = `name,description,basePrice,compareAtPrice,sku,stock,categoryName,tags,isActive,imageUrls,variantSku,variantName,variantPriceDiff,variantStock,variantOptions
"T-shirt Premium","Coton bio haute qualité",29.99,39.99,TSHIRT-BLK-001,50,Vêtements,"mode,homme",true,"https://example.com/img1.jpg|https://example.com/img2.jpg",,,,,
"T-shirt Premium","Coton bio haute qualité",29.99,39.99,TSHIRT-BLK-001,0,Vêtements,"mode,homme",true,"https://example.com/img1.jpg",TSHIRT-BLK-001-S,"Noir - S",0,20,"color:noir,size:S"
"T-shirt Premium","Coton bio haute qualité",29.99,39.99,TSHIRT-BLK-001,0,Vêtements,"mode,homme",true,"https://example.com/img1.jpg",TSHIRT-BLK-001-M,"Noir - M",0,15,"color:noir,size:M"`;
</content>

