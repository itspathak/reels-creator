/**
 * Idempotent database initializer (Postgres).
 * Reads database/schema.pg.sql and applies it.
 * Safe to run on every boot (all statements are CREATE ... IF NOT EXISTS).
 * Usage: node scripts/init-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || null;
const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'reelforge',
    });

(async () => {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.pg.sql');
  let sql = fs.readFileSync(schemaPath, 'utf8');

  // Each statement ends with ; — split into individual statements, apply each.
  const stmts = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const client = await pool.connect();
    try {
      // Check if any tables exist
      const q = await client.query(
        "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tableCount = parseInt(q.rows[0].n, 10);
      if (tableCount > 0) {
        console.log('[init-db] tables already exist, skipping schema apply');
        return;
      }

      for (const stmt of stmts) {
        await client.query(stmt + ';');
      }
      console.log('[init-db] schema applied successfully');
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[init-db] failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
  process.exit(0);
})();