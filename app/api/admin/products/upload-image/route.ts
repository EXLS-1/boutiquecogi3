// app/api/admin/products/upload-image/route.ts
// =============================================================================
// API — Upload d'une image produit vers Supabase Storage
// =============================================================================
// Reçoit un fichier image (multipart), le compresse/vérifie et l'uploade
// vers le bucket Supabase `product-images`.
//
// Retourne l'URL publique de l'image uploadée.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseSSRClient } from "@/lib/supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/admin/products/upload-image
 * Body : FormData avec champ `file` (image)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const entry = formData.get("file");

    if (!entry || !(entry instanceof File)) {
      return NextResponse.json({ error: "Fichier valide requis" }, { status: 400 });
    }

    const file = entry;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop lourd: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`,
        },
        { status: 400 },
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté (JPG, PNG, WebP uniquement)" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseSSRClient();

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("[UPLOAD_IMAGE] Supabase error:", error);
      return NextResponse.json(
        { error: `Échec de l'upload: ${error.message}` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error) {
    console.error("[UPLOAD_IMAGE]", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
