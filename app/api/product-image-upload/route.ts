// app/api/upload/route.ts
// Ce fichier gère l'upload sécurisé des images de produits via une route API POST.
// Il intègre une validation stricte du fichier, une authentification avec Better-Auth, et utilise Supabase Storage pour le stockage des fichiers.
// Les réponses sont structurées pour fournir des messages d'erreur clairs et des données utiles en cas de succès.
// Note : Assure-toi que les chemins d'importation et les propriétés de session correspondent à ta configuration Better-Auth.
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateUUIDv7 } from "@/lib/uuid";
import { auth } from "@/lib/auth"; // Assure-toi que ce chemin correspond à ton instance Better-Auth

// Constantes d'optimisation définies hors du scope de la requête
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export async function POST(request: NextRequest) {
  try {
    // 1. Validation de la session avec Better-Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé. Authentification requise." },
        { status: 401 },
      );
    }

    // Sécurité : Vérifier le rôle de l'utilisateur (ajuste la propriété selon ton schéma Better-Auth)
    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Accès refusé. Privilèges administrateur requis pour cette action.",
        },
        { status: 403 },
      );
    }

    // 2. Extraction du payload
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Requête invalide. Fichier manquant ou format non reconnu." },
        { status: 400 },
      );
    }

    // 3. Validation stricte du fichier
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Type de fichier rejeté. Formats acceptés : JPEG, PNG, WEBP, AVIF.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop lourd. Maximum autorisé : ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        },
        { status: 400 },
      );
    }

    // 4. Génération de l'identifiant et formatage sécurisé
    // On déduit l'extension depuis le type MIME validé pour éviter les failles liées au nom de fichier client
    const extension = file.type.split("/")[1];
    const uniqueName = `${generateUUIDv7()}.${extension}`;
    const filePath = `produits/${uniqueName}`;

    // 5. Interaction Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("images-boutique")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[SUPABASE_UPLOAD_ERROR]", error);
      return NextResponse.json(
        { error: "Échec du transfert vers le service de stockage." },
        { status: 500 },
      );
    }

    // 6. Récupération de l'URL publique
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("images-boutique")
      .getPublicUrl(filePath);

    return NextResponse.json(
      {
        path: data.path,
        url: publicUrlData.publicUrl,
      },
      { status: 201 }, // 201 Created est la norme REST pour une ressource générée avec succès
    );
  } catch (error) {
    console.error("[API_UPLOAD_FATAL_ERROR]", error);
    return NextResponse.json(
      {
        error:
          "Une erreur interne critique a empêché le traitement du fichier.",
      },
      { status: 500 },
    );
  }
}
