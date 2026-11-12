import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "../generated/prisma8/contract.d";
import contractJson from "../generated/prisma8/contract.json" with { type: "json" };

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({ url: connectionString, contract });
