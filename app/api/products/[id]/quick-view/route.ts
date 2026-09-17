import { NextResponse } from "next/server";
import { getProductData } from "@/lib/product-catalog/product-detail-query";
import { toProductQuickView } from "@/lib/product-catalog/product-quick-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id.trim() || id.length > 200) {
    return NextResponse.json({ error: "Identifiant produit invalide" }, { status: 400 });
  }

  try {
    const product = await getProductData(id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable ou indisponible" }, { status: 404 });
    }
    return NextResponse.json(toProductQuickView(product), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[ProductQuickView]", error);
    return NextResponse.json({ error: "Impossible de charger ce produit" }, { status: 500 });
  }
}
