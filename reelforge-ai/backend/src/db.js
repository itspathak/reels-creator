/**
 * database.js
 *
 * Dual-mode pool:
 *  - When process.env.DATABASE_URL is set (cloud / Vercel), use Postgres via
 *    the mysql2-compatible adapter below.
 *  - Otherwise use local MySQL (mysql2) directly, which natively supports
 *    `?` placeholders, `insertId` and `ON DUPLICATE KEY UPDATE`.
 *
 * Both paths expose the mysql2-style interface the app already uses:
 *   await db.execute(sql, params) -> [rows, okPacket]
 *   okPacket.insertId / affectedRows
 *   db.getConnection() -> { beginTransaction, commit, rollback, release }
 */
const mysql2 = require('mysql2');
const pg = require('pg');

const usePg = Boolean(process.env.DATABASE_URL);

/* ------------------------------------------------------------------ *
 * Postgres adapter (used only when DATABASE_URL is provided)
 * ------------------------------------------------------------------ */
let pool;
if (usePg) {
  const { Pool } = pg;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  module.exports = pgAdapter(pool);
} else {
  pool = mysql2.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'reelforge',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });
  module.exports = {
    execute: (...a) => pool.promise().execute(...a),
    query: (...a) => pool.promise().query(...a),
    async getConnection() {
      const c = await pool.promise().getConnection();
      return c;
    },
    on() {},
    end() {
      return pool.promise().end();
    },
  };
}

function pgAdapter(pgPool) {
  // Translate mysql2 `?` placeholders to postgres `$1, $2, …`
  function rewrite(sql, params = []) {
    let n = 0;
    let quoted = false;
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
      out += ch;
    }
    return out;
  }

  // Rewrite MySQL upsert syntax to Postgres ON CONFLICT
  function rewriteUpsert(sql) {
    if (!/ON DUPLICATE KEY UPDATE/i.test(sql)) return sql;
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

  return {
    async execute(sql, params = []) {
      let rewritten = rewrite(sql, params);
      rewritten = rewriteUpsert(rewritten);
      const isInsert = /^\s*INSERT/i.test(rewritten);
      if (isInsert && !/RETURNING/i.test(rewritten)) {
        rewritten = rewritten.trim().replace(/;?\s*$/, '') + ' RETURNING id';
      }
      const { rows, rowCount } = await pgPool.query(rewritten, params);
      const ok = {
        insertId: isInsert ? (rows[0]?.id ?? rowCount ?? 0) : (rowCount ?? 0),
        affectedRows: rowCount ?? (rows ? rows.length : 0),
      };
      return [rows, ok];
    },
    async query(sql, params = []) {
      return this.execute(sql, params);
    },
    async getConnection() {
      const client = await pgPool.connect();
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
      return pgPool.end();
    },
  };
}

module.exports.rawPool = pool;