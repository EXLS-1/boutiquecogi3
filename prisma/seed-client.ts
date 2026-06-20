import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false }, // Accepte certificat auto-signé en dev
})

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })