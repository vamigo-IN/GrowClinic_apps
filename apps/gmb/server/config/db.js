// PostgreSQL connection pool (pg).
// Tables live in the `gmb` schema of the shared `growclinic` database. The
// schema is created/changed ONLY by the platform migrate job
// (database/migrations/gmb) — this app never runs DDL at boot.
//
// Route code keeps mysql2-style named placeholders (`:name` + params object);
// q()/one()/exec() translate them to PostgreSQL `$n` parameters. camelCase
// identifiers are double-quoted in SQL (PostgreSQL folds unquoted names).
import pg from "pg";

const { Pool, types: pgTypes } = pg;

const DB_SCHEMA = process.env.DB_SCHEMA || "gmb";
if (!/^[a-z_][a-z0-9_]*$/.test(DB_SCHEMA)) throw new Error(`Invalid DB_SCHEMA: ${DB_SCHEMA}`);

// COUNT(*) is int8 in PostgreSQL — return numbers like mysql2 did. NUMERIC
// (rating/lat/lng) stays a string, exactly as mysql2 returned DECIMAL.
const PG_INT8 = 20;
const typeParsers = {
  getTypeParser(oid, format) {
    if (oid === PG_INT8 && format !== "binary") return (v) => (v === null ? null : Number(v));
    return pgTypes.getTypeParser(oid, format);
  },
};

// Pool size is deliberately small: four apps share one PostgreSQL server.
// See ARCHITECTURE.md → "Connection budget".
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: "growclinic-gmb",
  options: `-c search_path=${DB_SCHEMA} -c timezone=UTC`,
  types: typeParsers,
});
pool.on("error", (e) => console.warn("[gmb] idle DB client error:", e.message));

// `:name` → `$n` (same name reuses the same parameter). Skips quoted
// literals/identifiers and `::` casts. A referenced but missing parameter is an
// error, as it was with mysql2.
function toPg(sql, params = {}) {
  const values = [];
  const index = new Map();
  let out = "";
  let inS = false;
  let inD = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    if (c === ":" && !inS && !inD && sql[i - 1] !== ":" && /[A-Za-z_]/.test(sql[i + 1] || "")) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const name = sql.slice(i + 1, j);
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        throw new Error(`Missing SQL parameter :${name}`);
      }
      if (!index.has(name)) {
        values.push(params[name] === undefined ? null : params[name]);
        index.set(name, values.length);
      }
      out += `$${index.get(name)}`;
      i = j - 1;
      continue;
    }
    out += c;
  }
  return { text: out, values };
}

// Small helpers so route code stays terse.
export async function q(sql, params = {}) {
  const { text, values } = toPg(sql, params);
  const res = await pool.query(text, values);
  return res.rows;
}
export async function one(sql, params = {}) {
  const rows = await q(sql, params);
  return rows[0] || null;
}
export async function exec(sql, params = {}) {
  const { text, values } = toPg(sql, params);
  const res = await pool.query(text, values);
  return { affectedRows: res.rowCount, rows: res.rows };
}

// Fail fast on boot if the DB is misconfigured or not migrated yet.
const REQUIRED_TABLES = [
  "users", "organizations", "memberships", "otp_codes", "sessions", "locations",
  "google_connections", "health_scores", "location_issues", "reviews", "content_drafts",
  "qr_assets", "subscriptions", "invoices", "public_audits", "audit_events",
];

export async function assertDb() {
  try {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES]
    );
    const present = new Set(rows.map((r) => r.table_name));
    const missing = REQUIRED_TABLES.filter((t) => !present.has(t));
    if (missing.length) {
      throw new Error(`schema "${DB_SCHEMA}" is not migrated (missing: ${missing.join(", ")}) — run the platform migrate job`);
    }
    console.log(`[gmb] PostgreSQL connected (schema ${DB_SCHEMA})`);
  } catch (e) {
    console.error("[gmb] PostgreSQL init failed — check DATABASE_URL / migrations:", e.message);
    throw e;
  }
}
