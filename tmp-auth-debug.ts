import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { auth } from "./lib/auth";

async function main() {
  const candidates = [
    process.env.SUPER_ADMIN_EMAIL,
    process.env.INITIAL_SUPERADMIN_EMAIL,
    "admin@boutiquecogi3.cd",
    "superadmin@boutiquecogi3.cd",
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const emails = [...new Set(candidates.map((value) => value.trim().toLowerCase()))];
  console.log("CANDIDATE_EMAILS", emails);

  const knownPasswordCandidates = [
    process.env.SUPER_ADMIN_PASSWORD,
    process.env.INITIAL_SUPERADMIN_PASSWORD,
    "@@@123Admin123@@@",
    "Password123!",
  ].filter((value): value is string => !!value);

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        accounts: {
          select: {
            id: true,
            password: true,
            type: true,
            providerId: true,
            accountId: true,
          },
        },
      },
    });

    console.log("USER_FOR_EMAIL", JSON.stringify({ email, user }, null, 2));

    if (user?.accounts?.length) {
      for (const account of user.accounts) {
        if (!account.password) {
          console.log("NULL_PASSWORD", account.id);
          continue;
        }

        console.log("HASH_PREFIX", account.password.slice(0, 20), "BCRYPT", account.password.startsWith("$2"));
        for (const p of knownPasswordCandidates) {
          console.log("COMPARE", JSON.stringify(p), await bcrypt.compare(p, account.password));
        }
      }
    }
  }

  for (const [loginEmail, loginPassword] of [
    ["excellentservice1exls@gmail.com", "@@@123Admin123@@@"],
    ["admin@boutiquecogi3.cd", "Password123!"],
  ] as const) {
    try {
      const result = await auth.api.signInEmail({
        body: { email: loginEmail, password: loginPassword },
        headers: new Headers({ "x-forwarded-for": "127.0.0.1" }),
      });
      console.log("BETTER_AUTH_SIGNIN_OK", loginEmail, JSON.stringify(result, null, 2));
    } catch (error) {
      console.log("BETTER_AUTH_SIGNIN_ERR", loginEmail, error instanceof Error ? error.message : String(error));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
