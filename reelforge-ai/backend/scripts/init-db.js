/**
 * Idempotent database initializer.
 * Reads database/schema.sql and applies it to the DB pointed to by env vars.
 * Safe to run on every boot (all statements are CREATE ... IF NOT EXISTS).
 * Usage: node scripts/init-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'reelforge';

(async () => {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  let sql = fs.readFileSync(schemaPath, 'utf8');

  // The connection already targets `database`, so drop database/USE statements.
  sql = sql
    .replace(/CREATE DATABASE IF NOT EXISTS[^;]+;?/gi, '')
    .replace(/USE\s+[a-zA-Z0-9_`]+[;]?/gi, '');

  const conn = mysql.createConnection({
    host, user, password, database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  const run = () => new Promise((resolve, reject) => {
    conn.query(sql, (err) => (err ? reject(err) : resolve()));
  });

  const schemaExists = () => new Promise((resolve) => {
    conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?",
      [database],
      (err, rows) => resolve(err ? false : (rows[0] && rows[0].n > 0))
    );
  });

  try {
    conn.connect(async (err) => {
      if (err) {
        console.error('[init-db] connect failed:', err.message);
        process.exit(1);
      }
      const hasTables = await schemaExists();
      if (hasTables) {
        console.log('[init-db] tables already exist, skipping schema apply');
        conn.end();
        process.exit(0);
      }
      try {
        await run();
        console.log('[init-db] schema applied successfully');
        conn.end();
        process.exit(0);
      } catch (e) {
        console.error('[init-db] schema apply failed:', e.message);
        conn.end();
        process.exit(1);
      }
    });
  } catch (e) {
    console.error('[init-db] unexpected error:', e.message);
    process.exit(1);
  }
})();