// lib/images/remote-uploader.ts
// =============================================================================
// UPLOAD IMAGES DISTANTES → SUPABASE STORAGE
// =============================================================================
// Télécharge des images depuis des URLs distantes (à partir d'un CSV importé)
// puis les uploade vers Supabase Storage pour un hébergement local.
//
// Sécurité :
//   - Timeout 30s par image
//   - Vérification MIME type (image/*)
//   - Vérification taille max 10MB
//   - Extension autorisée (jpg, jpeg, png, webp)
//   - Concurrence limitée (5 uploads parallèles max)
// =============================================================================

import { createSupabaseSSRClient } from "@/lib/supabase/ssr";
import { nanoid } from "nanoid";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 30_000; // 30s
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const CONCURRENCY = 5;

export interface RemoteUploadResult {
  originalUrl: string;
  supabaseUrl: string | null;
  error?: string;
}

/**
 * Télécharge une image distante et l'uploade vers Supabase.
 * @returns L'URL publique Supabase ou null si échec.
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  productSlug: string,
): Promise<RemoteUploadResult> {
  try {
    // 1. Validation URL
    const url = new URL(imageUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Protocole non supporté");
    }

    // 2. Vérification extension
    const ext = url.pathname.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((e) => ext.endsWith(e));
    if (!hasValidExt) {
      throw new Error("Extension non supportée (jpg, png, webp uniquement)");
    }

    // 3. Téléchargement avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BoutiqueCogi3-Importer/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image trop lourde: ${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    const blob = await response.blob();

    // 4. Vérification MIME type
    if (!blob.type.startsWith("image/")) {
      throw new Error("Le contenu téléchargé n'est pas une image");
    }

    // 5. Upload vers Supabase
    const supabase = await createSupabaseSSRClient();
    const fileExt = blob.type === "image/png" ? "png" : "webp";
    const fileName = `${productSlug}/${nanoid()}.${fileExt}`;
    const filePath = `products/imported/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(filePath);

    return { originalUrl: imageUrl, supabaseUrl: publicUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Téléchargement échoué";
    return { originalUrl: imageUrl, supabaseUrl: null, error: message };
  }
}

/**
 * Upload des images distantes par lots avec concurrence limitée.
 */
export async function batchUploadRemoteImages(
  imageUrls: string[],
  productSlug: string,
): Promise<RemoteUploadResult[]> {
  const results: RemoteUploadResult[] = [];
  const queue = [...new Set(imageUrls)]; // Déduplique

  // Traitement par lots de CONCURRENCY
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((url) => downloadAndUploadImage(url, productSlug)),
    );
    results.push(...batchResults);
  }

  return results;
}

