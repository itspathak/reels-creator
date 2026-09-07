/**
 * MySQL2-compatible database adapter backed by PostgreSQL.
 *
 * The app was written against mysql2 (`pool.execute(sql, params)` returning
 * `[rows, fields]`, `result.insertId`, `?` placeholders, `ON DUPLICATE KEY`).
 * This module exposes the exact same interface on top of `pg` so that the
 * models/controllers needed no changes when switching the cloud DB from MySQL
 * to Postgres (Vercel Storage / Neon).
 */
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || null;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'reelforge',
    });

// Translate mysql2 `?` placeholders to postgres `$1, $2, …`
function rewrite(sql, params = []) {
  let n = 0;
  let quoted = false;
  // Backticks are used for the reserved `usage` table. Convert to double quotes.
  let out = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === '`') {
      out += '"';
      continue;
    }
    if (ch === '?' && params) {
      n += 1;
      out += `$${n}`;
      continue;
    }
    if (ch === "'") {
      quoted = !quoted;
      out += ch;
      continue;
    }
    out += quoted && ch === '?' ? ch : ch;
  }
  return out;
}

// Rewrite MySQL upsert syntax to Postgres ON CONFLICT
function rewriteUpsert(sql) {
  if (!/ON DUPLICATE KEY UPDATE/i.test(sql)) return sql;
  // extract INSERT INTO <table>
  const tbl = sql.match(/INSERT\s+INTO\s+"?(\w+)"?\s*\(/i);
  const table = tbl ? tbl[1].toLowerCase() : null;
  const CONFLICT_COLS = { brand_kits: 'user_id', templates: 'name' };
  const conflictCol = CONFLICT_COLS[table];
  const assigns = sql
    .match(/ON DUPLICATE KEY UPDATE([\s\S]*)$/i)?.[1]
    ?.split(',')
    .map((a) => {
      const m = a.trim().match(/^"?(\w+)"?\s*=\s*VALUES\(\s*"?(\w+)"?\s*\)$/i);
      return m ? `${m[1]} = EXCLUDED.${m[2]}` : null;
    })
    .filter(Boolean)
    .join(', ');
  if (!conflictCol || !assigns) return sql;
  return (
    sql.replace(/ON DUPLICATE KEY UPDATE[\s\S]*$/i, '').trim() +
    ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${assigns}`
  );
}

const adapter = {
  async execute(sql, params = []) {
    let rewritten = rewrite(sql, params);
    rewritten = rewriteUpsert(rewritten);

    // Ensure INSERTs return the new row id (mysql2's `insertId`).
    const isInsert = /^\s*INSERT/i.test(rewritten);
    if (isInsert && !/RETURNING/i.test(rewritten)) {
      rewritten = rewritten.trim().replace(/;?\s*$/, '') + ' RETURNING id';
    }

    const { rows, rowCount } = await pool.query(rewritten, params);
    const out = [rows];
    // second element mimics the mysql2 `fields`/`OkPacket` shape used by callers
    const ok = {
      insertId: isInsert ? (rows[0]?.id ?? rowCount ?? 0) : (rowCount ?? 0),
      affectedRows: rowCount ?? (rows ? rows.length : 0),
    };
    out.push(ok);
    return out;
  },

  async query(sql, params = []) {
    return this.execute(sql, params);
  },

  async getConnection() {
    const client = await pool.connect();
    // mysql2-style transactional helpers
    return {
      ...client,
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },

  on() {},
  end() {
    return pool.end();
  },
};

module.exports = adapter;