// prisma/seed-client.ts

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { resolvePostgresConnectionString } from '../lib/prisma-connection'

// Même résolution/validation que le runtime applicatif (lib/prisma.ts) :
// un gabarit non remplacé échoue immédiatement avec un message explicite.
const { connectionString } = resolvePostgresConnectionString()

const pool = new Pool({
  connectionString,
  // Only enable SSL in production. In development, set ssl to false so local Postgres without TLS works.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
})

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })