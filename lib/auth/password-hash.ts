import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export function isValidBcryptHash(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith("$2")) return false;

  try {
    const rounds = bcrypt.getRounds(value);
    if (!Number.isInteger(rounds) || rounds < 4) return false;
    bcrypt.compareSync("probe-password-for-validation", value);
    return true;
  } catch {
    return false;
  }
}

export async function repairInvalidPasswordHashIfNeeded({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return false;

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: {
      id: true,
      accounts: {
        where: { providerId: "credential" },
        select: { id: true, password: true },
        orderBy: { id: "asc" },
        take: 1,
      },
    },
  });

  const account = user?.accounts?.[0];
  if (!account) return false;
  if (account.password && isValidBcryptHash(account.password)) return false;

  const nextHash = await bcrypt.hash(password, 10);
  await prisma.account.update({
    where: { id: account.id },
    data: {
      password: nextHash,
      updatedAt: new Date(),
    },
  });

  return true;
}
