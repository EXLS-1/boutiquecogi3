  // app/api/media/route.ts

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Chemin vers le dossier public/media
    const mediaDir = path.join(process.cwd(), "public/media");

    // Vérifier si le dossier existe
    if (!fs.existsSync(mediaDir)) {
      console.warn("Media directory does not exist:", mediaDir);
      return NextResponse.json([]);
    }

    // Lire les fichiers du dossier
    const files = fs.readdirSync(mediaDir);

    // Filtrer pour ne garder que les fichiers (pas les dossiers)
    const imageFiles: string[] = [];

    for (const file of files) {
      const filePath = path.join(mediaDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          imageFiles.push(file);
        }
      } catch {
        // Ignorer les fichiers inaccessibles
        continue;
      }
    }

    return NextResponse.json(imageFiles, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error reading media directory:", message);
    return NextResponse.json(
      { error: "Failed to read media directory", details: message },
      { status: 500 }
    );
  }
}
