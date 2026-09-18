#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// MySQL → PostgreSQL data import for the GrowClinic platform.
//
//   node import.mjs import   [--apps a,b] [--allow-non-empty]
//   node import.mjs validate [--apps a,b] [--validate-constraints]
//
// The TARGET schema must already exist (run the platform migrate job first);
// this tool never creates, alters or drops tables. It only reads from MySQL.
//
// Sources (one MySQL database per application, any may be omitted):
//   IMPORT_SOURCE_GROWCLINIC_URL  mysql://user:pass@host:3306/db
//   IMPORT_SOURCE_AUDIT_URL
//   IMPORT_SOURCE_GMB_URL
//   IMPORT_SOURCE_ENGINE_URL
// Point these at a RESTORED COPY of a dump (e.g. the `import-mysql` service),
// never at the live production server.
//
// Target: POSTGRES_HOST/PORT/DB + POSTGRES_SUPERUSER(_PASSWORD).
//
// Time zones: MySQL DATETIME has no zone. Prisma apps (growclinic, engine)
// always wrote UTC. For audit/gmb, CURRENT_TIMESTAMP used the MySQL server
// zone — check `SELECT @@global.time_zone, @@system_time_zone, NOW(), UTC_TIMESTAMP();`
// on the source and set IMPORT_AUDIT_SOURCE_TZ / IMPORT_GMB_SOURCE_TZ (e.g.
// "+00:00", "+05:30"). Default "+00:00".
//
// Import runs one transaction per application (all-or-nothing) with
// session_replication_role=replica so rows load in any order and legacy orphan
// rows are preserved; `validate` then reports them.
// ─────────────────────────────────────────────────────────────────────────────
import mysql from "mysql2/promise";
import pg from "pg";
import { createHash } from "node:crypto";

const [, , command = "", ...rest] = process.argv;
const flag = (name) => rest.includes(name);
const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };

const APPS = {
  growclinic: {
    source: "IMPORT_SOURCE_GROWCLINIC_URL",
    tz: () => "+00:00",
    tables: ["User", "Tag", "Post", "_PostToTag", "Media", "Lead", "ContactMessage", "ConsultationBooking",
             "Project", "ClinicAudit", "Testimonial", "SiteSettings", "ClientLogo", "CaseStudy"],
  },
  audit: {
    source: "IMPORT_SOURCE_AUDIT_URL",
    tz: () => process.env.IMPORT_AUDIT_SOURCE_TZ || "+00:00",
    tables: ["admin_users", "settings", "leads", "chat_sessions", "admin_sessions", "admin_login_attempts",
             "popup_leads", "admin_logs", "api_usage", "lead_tasks", "lead_events", "raw_events",
             "automation_rules", "automation_runs", "failed_crm_events", "xp_ledger", "checkins",
             "notification_prefs"],
  },
  gmb: {
    source: "IMPORT_SOURCE_GMB_URL",
    tz: () => process.env.IMPORT_GMB_SOURCE_TZ || "+00:00",
    tables: ["users", "organizations", "memberships", "otp_codes", "sessions", "locations",
             "google_connections", "health_scores", "location_issues", "reviews", "content_drafts",
             "qr_assets", "subscriptions", "invoices", "public_audits", "audit_events"],
  },
  engine: {
    source: "IMPORT_SOURCE_ENGINE_URL",
    tz: () => "+00:00",
    tables: ["Clinic", "ActivationKey", "User", "Lead"],
  },
};

// Relationships to check after import (child → parent). Soft references in
// audit are intentionally included: they are reported, not enforced.
const RELATIONS = {
  growclinic: [["Post", "authorId", "User", "id"], ["_PostToTag", "A", "Post", "id"], ["_PostToTag", "B", "Tag", "id"]],
  audit: [["chat_sessions", "ownerId", "admin_users", "id"], ["admin_sessions", "userId", "admin_users", "id"],
          ["xp_ledger", "userId", "admin_users", "id"], ["checkins", "userId", "admin_users", "id"],
          ["notification_prefs", "userId", "admin_users", "id"], ["automation_runs", "ruleId", "automation_rules", "id"],
          ["lead_tasks", "sessionId", "chat_sessions", "sessionId"], ["lead_events", "sessionId", "chat_sessions", "sessionId"]],
  gmb: [["memberships", "userId", "users", "id"], ["memberships", "orgId", "organizations", "id"],
        ["sessions", "userId", "users", "id"], ["locations", "orgId", "organizations", "id"],
        ["google_connections", "orgId", "organizations", "id"], ["health_scores", "locationId", "locations", "id"],
        ["location_issues", "locationId", "locations", "id"], ["reviews", "locationId", "locations", "id"],
        ["content_drafts", "locationId", "locations", "id"], ["qr_assets", "locationId", "locations", "id"],
        ["subscriptions", "orgId", "organizations", "id"], ["invoices", "orgId", "organizations", "id"]],
  engine: [["ActivationKey", "clinicId", "Clinic", "id"], ["User", "clinicId", "Clinic", "id"], ["Lead", "clinicId", "Clinic", "id"]],
};

const selected = (opt("--apps") || Object.keys(APPS).join(",")).split(",").map((s) => s.trim()).filter(Boolean);
for (const a of selected) if (!APPS[a]) { console.error(`unknown app: ${a}`); process.exit(2); }

const qi = (s) => `"${String(s).replace(/"/g, '""')}"`;
const mi = (s) => `\`${String(s).replace(/`/g, "``")}\``;
const log = (...a) => console.log(...a);

function target() {
  return new pg.Client({
    host: process.env.POSTGRES_HOST || "postgres",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || "growclinic",
    user: process.env.POSTGRES_SUPERUSER || "gc_admin",
    password: process.env.POSTGRES_SUPERUSER_PASSWORD,
    application_name: "growclinic-import",
  });
}

async function source(app) {
  const url = process.env[APPS[app].source];
  if (!url) return null;
  return mysql.createConnection({
    uri: url,
    dateStrings: true,            // raw DATETIME text — zone applied explicitly below
    supportBigNumbers: true,
    bigNumberStrings: true,       // BIGINT as exact strings
    charset: "utf8mb4",
  });
}

async function targetColumns(pgc, schema, table) {
  const { rows } = await pgc.query(
    `SELECT column_name, data_type, udt_name, character_maximum_length AS maxlen, is_nullable = 'YES' AS nullable,
            is_identity = 'YES' AS identity
       FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
    [schema, table]);
  return rows;
}

async function sourceColumns(my, table) {
  const [rows] = await my.query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, [table]);
  return rows.map((r) => r.name);
}

async function primaryKey(pgc, schema, table) {
  const { rows } = await pgc.query(
    `SELECT a.attname FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`, [schema, table]);
  return rows.map((r) => r.attname);
}

const ZERO_DATE = /^0000-00-00/;
function converter(col, tz, stats) {
  const t = col.data_type;
  return (v) => {
    if (v === null || v === undefined) return null;
    switch (t) {
      case "boolean":
        return v === true || v === 1 || v === "1" || (Buffer.isBuffer(v) && v[0] === 1);
      case "smallint": case "integer":
        return typeof v === "boolean" ? (v ? 1 : 0) : Number(v);
      case "bigint": case "numeric":
        return String(v);
      case "timestamp with time zone":
        if (ZERO_DATE.test(v)) { stats.zeroDates++; return null; }
        return `${String(v).replace(" ", "T")}${tz}`;
      case "timestamp without time zone":
        if (ZERO_DATE.test(v)) { stats.zeroDates++; return null; }
        return String(v);
      case "date":
        if (ZERO_DATE.test(v)) { stats.zeroDates++; return null; }
        return String(v).slice(0, 10);
      case "jsonb": case "json":
        if (typeof v === "string") { JSON.parse(v); return v; }
        return JSON.stringify(v);
      default: {
        const s = Buffer.isBuffer(v) ? v.toString("utf8") : String(v);
        if (col.maxlen && [...s].length > col.maxlen) stats.overflow.push(`${col.column_name} (${[...s].length} > ${col.maxlen})`);
        return s;
      }
    }
  };
}

async function importApp(app, allowNonEmpty) {
  const my = await source(app);
  if (!my) { log(`– ${app}: ${APPS[app].source} not set, skipped`); return true; }
  const pgc = target();
  await pgc.connect();
  const tz = APPS[app].tz();
  let ok = true;
  try {
    await pgc.query("BEGIN");
    await pgc.query("SET LOCAL session_replication_role = replica");
    await pgc.query("SET LOCAL timezone = 'UTC'");
    for (const table of APPS[app].tables) {
      const [[exists]] = await my.query(
        "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [table]);
      if (!Number(exists.n)) { log(`  ${app}.${table}: not in source, skipped`); continue; }

      const tcols = await targetColumns(pgc, app, table);
      if (!tcols.length) throw new Error(`target table ${app}.${table} missing — run the migrate job first`);
      const scols = await sourceColumns(my, table);
      const tnames = new Set(tcols.map((c) => c.column_name));
      const dropped = scols.filter((c) => !tnames.has(c));
      if (dropped.length) throw new Error(`${table}: source columns with no target column (data would be lost): ${dropped.join(", ")}`);
      const cols = tcols.filter((c) => scols.includes(c.column_name));

      const { rows: [{ n: existing }] } = await pgc.query(`SELECT COUNT(*)::int AS n FROM ${qi(app)}.${qi(table)}`);
      if (existing > 0 && !allowNonEmpty) throw new Error(`${app}.${table} already has ${existing} rows — refusing to import (use --allow-non-empty only if you know why)`);

      const stats = { zeroDates: 0, overflow: [] };
      const conv = cols.map((c) => converter(c, tz, stats));
      const batchSize = Math.max(1, Math.min(500, Math.floor(60000 / cols.length)));
      const insertPrefix = `INSERT INTO ${qi(app)}.${qi(table)} (${cols.map((c) => qi(c.column_name)).join(", ")}) VALUES `;
      let batch = [], count = 0;
      const flush = async () => {
        if (!batch.length) return;
        const params = [];
        const tuples = batch.map((row) => `(${cols.map((c, i) => { params.push(conv[i](row[c.column_name])); return `$${params.length}`; }).join(", ")})`);
        await pgc.query(insertPrefix + tuples.join(", "), params);
        count += batch.length;
        batch = [];
      };
      const stream = my.connection.query(`SELECT ${cols.map((c) => mi(c.column_name)).join(", ")} FROM ${mi(table)}`).stream({ highWaterMark: 500 });
      for await (const row of stream) {
        batch.push(row);
        if (batch.length >= batchSize) await flush();
      }
      await flush();

      if (stats.overflow.length) throw new Error(`${table}: values longer than target varchar: ${[...new Set(stats.overflow)].slice(0, 10).join("; ")}`);
      const notes = [];
      if (stats.zeroDates) notes.push(`${stats.zeroDates} zero-date value(s) → NULL`);
      const missing = tcols.filter((c) => !scols.includes(c.column_name)).map((c) => c.column_name);
      if (missing.length) notes.push(`target-only columns left at default: ${missing.join(", ")}`);
      log(`  ${app}.${table}: ${count} row(s)${notes.length ? ` (${notes.join("; ")})` : ""}`);

      // Identity columns: continue after the highest imported id.
      for (const c of tcols.filter((x) => x.identity)) {
        await pgc.query(
          `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${qi(c.column_name)}) FROM ${qi(app)}.${qi(table)}), 0) + 1, false)`,
          [`${qi(app)}.${qi(table)}`, c.column_name]);
      }
    }
    await pgc.query("COMMIT");
    log(`✔ ${app}: committed`);
  } catch (e) {
    await pgc.query("ROLLBACK").catch(() => {});
    console.error(`✘ ${app}: ${e.message} — rolled back, nothing imported for ${app}`);
    ok = false;
  } finally {
    await pgc.end();
    await my.end();
  }
  return ok;
}

async function pkDigestSource(my, table, pk) {
  const h = createHash("sha256");
  const [rows] = await my.query(`SELECT ${pk.map(mi).join(", ")} FROM ${mi(table)}`);
  rows.map((r) => pk.map((k) => String(r[k])).join("")).sort().forEach((k) => h.update(k + "\n"));
  return { n: rows.length, digest: h.digest("hex") };
}
async function pkDigestTarget(pgc, schema, table, pk) {
  const h = createHash("sha256");
  const { rows } = await pgc.query(`SELECT ${pk.map((k) => `${qi(k)}::text AS ${qi(k)}`).join(", ")} FROM ${qi(schema)}.${qi(table)}`);
  rows.map((r) => pk.map((k) => String(r[k])).join("")).sort().forEach((k) => h.update(k + "\n"));
  return { n: rows.length, digest: h.digest("hex") };
}

async function validateApp(app, validateConstraints) {
  const my = await source(app);
  const pgc = target();
  await pgc.connect();
  let ok = true;
  try {
    log(`\n== ${app}`);
    for (const table of APPS[app].tables) {
      const pk = await primaryKey(pgc, app, table);
      const t = await pkDigestTarget(pgc, app, table, pk);
      if (!my) { log(`  ${table.padEnd(22)} target=${t.n} (no source configured)`); continue; }
      const [[exists]] = await my.query(
        "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [table]);
      if (!Number(exists.n)) { log(`  ${table.padEnd(22)} target=${t.n} (not in source)`); continue; }
      const s = await pkDigestSource(my, table, pk);
      const same = s.n === t.n && s.digest === t.digest;
      if (!same) ok = false;
      log(`  ${same ? "✔" : "✘"} ${table.padEnd(22)} source=${s.n} target=${t.n} keys=${s.digest === t.digest ? "match" : "DIFFER"}`);
    }
    for (const [child, col, parent, pcol] of RELATIONS[app] || []) {
      const { rows: [{ n }] } = await pgc.query(
        `SELECT COUNT(*)::int AS n FROM ${qi(app)}.${qi(child)} c
          WHERE c.${qi(col)} IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM ${qi(app)}.${qi(parent)} p WHERE p.${qi(pcol)} = c.${qi(col)})`);
      log(`  ${n ? "⚠" : "✔"} ${child}.${col} → ${parent}.${pcol}: ${n} orphan(s)`);
    }
    const { rows: notValid } = await pgc.query(
      `SELECT conrelid::regclass::text AS tbl, conname FROM pg_constraint
        WHERE connamespace = $1::regnamespace AND contype = 'f' AND NOT convalidated`, [app]);
    for (const c of notValid) {
      if (!validateConstraints) { log(`  • ${c.tbl} ${c.conname}: NOT VALID (enforced for new rows; run with --validate-constraints to validate history)`); continue; }
      try {
        await pgc.query(`ALTER TABLE ${c.tbl} VALIDATE CONSTRAINT ${qi(c.conname)}`);
        log(`  ✔ ${c.tbl} ${c.conname}: validated`);
      } catch (e) {
        log(`  ⚠ ${c.tbl} ${c.conname}: cannot validate (${e.message}) — resolve the orphans above first`);
      }
    }
  } finally {
    await pgc.end();
    if (my) await my.end();
  }
  return ok;
}

if (command === "import") {
  let ok = true;
  for (const app of selected) ok = (await importApp(app, flag("--allow-non-empty"))) && ok;
  process.exit(ok ? 0 : 1);
} else if (command === "validate") {
  let ok = true;
  for (const app of selected) ok = (await validateApp(app, flag("--validate-constraints"))) && ok;
  log(ok ? "\n✅ row counts and primary keys match" : "\n❌ differences found");
  process.exit(ok ? 0 : 1);
} else {
  console.error("usage: node import.mjs import|validate [--apps growclinic,audit,gmb,engine] [--allow-non-empty] [--validate-constraints]");
  process.exit(2);
}
