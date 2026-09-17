import { config } from "dotenv";
import { resolve } from "node:path";

// Charger avant les modules du seed : environnement > .env.local > .env.
config({
  path: [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")],
  override: false,
  quiet: true,
});
