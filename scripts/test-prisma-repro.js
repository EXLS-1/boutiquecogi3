require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const isRemote = connectionString && (connectionString.includes('supabase') || connectionString.includes('aws'));
const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['PUBLISHED'] },
        deletedAt: null,
      },
      take: 5,
      select: { id: true, status: true },
    });
    console.log('SUCCESS:', JSON.stringify(products, null, 2));
  } catch (err) {
    console.error('PRISMA ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
test();
