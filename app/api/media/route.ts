// app/api/media/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const fileStats = files.map((file) => ({
      name: file,
      isFile: fs.statSync(path.join(mediaDir, file)).isFile(),
    }));

    const imageFiles = fileStats
      .filter((item) => item.isFile)
      .map((item) => item.name);

    return NextResponse.json(imageFiles);
  } catch (error) {
    console.error("Error reading media directory:", error);
    return NextResponse.json([], { status: 500 });
  }
}
