import { auth } from "@/lib/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

// Ce fichier s'exécute dans l'environnement Node.js standard.
// Il a le droit d'importer BetterAuth et Prisma.
const handler = toNextJsHandler(auth);

export { handler as GET, handler as POST };