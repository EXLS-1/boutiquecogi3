// scripts/check-db-types.ts
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  });

  // Check account table userId type
  const result = await pool.query(`
    SELECT column_name, data_type, udt_name, character_maximum_length
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'account' 
      AND column_name = 'userId'
  `);
  console.log("Account.userId column:", JSON.stringify(result.rows, null, 2));

  // Check product_image table productId type
  const result2 = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'product_image' 
      AND column_name = 'productId'
  `);
  console.log("ProductImage.productId column:", JSON.stringify(result2.rows, null, 2));

  // Check all tables with text columns that should be uuid
  const result3 = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('text', 'character varying')
      AND column_name LIKE '%Id' OR column_name LIKE '%id'
    ORDER BY table_name, column_name
  `);
  console.log("All potential id columns:", JSON.stringify(result3.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
