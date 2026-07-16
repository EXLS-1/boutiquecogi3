import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    // Better-Auth expects request headers (cookies for session + CSRF if any)
    const hdrs = await headers();

    // Better-Auth server API (built-in route-handler pattern)
    // We forward the raw JSON body to the social sign-in endpoint.
    const body = await req.json().catch(() => ({}));

    const result = await auth.api.signInSocial({
      headers: hdrs,
      body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/auth/sign-in/social failed:", error);
    return NextResponse.json(
      { error: "Social sign-in failed" },
      { status: 400 }
    );
  }
}

