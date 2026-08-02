import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get("__Host-2fa")?.value;

  if (!challengeToken) {
    return NextResponse.json({ requires2FA: false });
  }

  const verification = await prisma.verification.findFirst({
    where: {
      value: challengeToken,
      type: "TWO_FACTOR",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    cookieStore.set("__Host-2fa", "", { maxAge: 0, path: "/" });
    return NextResponse.json({ requires2FA: false });
  }

  return NextResponse.json({ requires2FA: true });
}
