import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  // Only enable SSL in production. In development, set ssl to false so local Postgres without TLS works.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
})

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })