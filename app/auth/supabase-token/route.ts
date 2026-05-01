import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Ton instance BetterAuth côté serveur
import { headers } from "next/headers";
import { SignJWT } from "jose";

export async function GET() {
  try {
    // 1. Vérification stricte de l'identité via BetterAuth
    const session = await auth.api.getSession({
      headers: headers(),
    });

    if (!session || !session.user) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    // 2. Récupération du JWT Secret de Supabase
    const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
    if (!supabaseSecret) {
      throw new Error("SUPABASE_JWT_SECRET manquant");
    }

    // 3. Forger le JWT compatible Supabase
    const secret = new TextEncoder().encode(supabaseSecret);
    const alg = "HS256";

    const jwt = await new SignJWT({
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expire dans 1 heure
      sub: session.user.id, // L'ID BetterAuth injecté
      role: "authenticated",
      email: session.user.email,
    })
      .setProtectedHeader({ alg, typ: "JWT" })
      .sign(secret);

    return NextResponse.json({ token: jwt });
  } catch (error) {
    console.error("Erreur de génération JWT Supabase:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}