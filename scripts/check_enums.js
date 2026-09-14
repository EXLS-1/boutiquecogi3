const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Pool } = require("pg");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log("DB URL host:", connectionString ? connectionString.split("@")[1] : "NONE");

const isRemote = connectionString && (connectionString.includes("supabase") || connectionString.includes("aws"));
const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const typesRes = await pool.query(`
      SELECT t.typname, t.typtype, n.nspname
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname ILIKE '%product%' OR t.typname ILIKE '%status%'
      ORDER BY n.nspname, t.typname;
    `);
    console.log("--- TYPES FOUND ---");
    console.log(JSON.stringify(typesRes.rows, null, 2));

    const colsRes = await pool.query(`
      SELECT table_name, column_name, udt_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('product', 'product_status_history')
      ORDER BY table_name, column_name;
    `);
    console.log("--- COLUMNS FOUND ---");
    console.log(JSON.stringify(colsRes.rows, null, 2));

    const enumValuesRes = await pool.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname ILIKE '%product%' OR t.typname ILIKE '%status%'
      ORDER BY t.typname, e.enumsortorder;
    `);
    console.log("--- ENUM VALUES FOUND ---");
    console.log(JSON.stringify(enumValuesRes.rows, null, 2));

  } catch (err) {
    console.error("Error inspecting db:", err.message);
  } finally {
    await pool.end();
  }
}

main();
