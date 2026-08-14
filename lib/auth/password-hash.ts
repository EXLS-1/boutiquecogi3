import bcrypt from "bcryptjs";
import { randomBytes, scrypt } from "node:crypto";
import { prisma } from "@/lib/prisma";

const LEGACY_SCRYPT_CONFIG = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

function generateLegacyScryptKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      LEGACY_SCRYPT_CONFIG.dkLen,
      {
        N: LEGACY_SCRYPT_CONFIG.N,
        r: LEGACY_SCRYPT_CONFIG.r,
        p: LEGACY_SCRYPT_CONFIG.p,
        maxmem: 128 * LEGACY_SCRYPT_CONFIG.N * LEGACY_SCRYPT_CONFIG.r * 2,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      }
    );
  });
}

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

export async function hashPasswordWithBetterAuth(password: string): Promise<string> {
  return bcrypt.hash(password.normalize("NFKC"), 10);
}

export async function verifyBetterAuthPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (!hash || !password) return false;

  if (hash.startsWith("$2")) {
    return bcrypt.compare(password.normalize("NFKC"), hash);
  }

  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;

  try {
    const targetKey = await generateLegacyScryptKey(password, salt);
    return targetKey.toString("hex") === key;
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

  const nextHash = await hashPasswordWithBetterAuth(password);
  await prisma.account.update({
    where: { id: account.id },
    data: {
      password: nextHash,
      updatedAt: new Date(),
    },
  });

  return true;
}
