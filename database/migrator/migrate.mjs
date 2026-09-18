#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GrowClinic platform migrator — the ONLY process that changes database
// structure. Applications never run DDL at start-up.
//
//   node migrate.mjs apply    bootstrap roles → SQL migrations (core, audit,
//                             gmb) → prisma migrate deploy (growclinic, engine)
//                             → ownership + least-privilege grants
//   node migrate.mjs status   report pending/applied migrations, change nothing
//   node migrate.mjs check    like status, but exit 1 when anything is pending
//                             (production: apps refuse to start on an
//                             un-migrated database until an operator applies)
//
// Mode defaults to $MIGRATE_MODE, then "apply".
//
// Safety properties:
//   • forward-only; there is no "reset"/"down" path in this tool
//   • a PostgreSQL advisory lock serialises concurrent runs
//   • each SQL migration runs in one transaction together with its ledger row
//   • applied SQL files are checksummed; an edited, already-applied file aborts
//     the run instead of silently diverging
//   • passwords are never logged
// ─────────────────────────────────────────────────────────────────────────────
import pg from "pg";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MODE = (process.argv[2] || process.env.MIGRATE_MODE || "apply").toLowerCase();
if (!["apply", "status", "check"].includes(MODE)) {
  console.error(`Unknown mode "${MODE}" (expected apply | status | check)`);
  process.exit(2);
}

const ROOT = process.env.MIGRATIONS_ROOT || "/migrations";
const LOCK_KEY = "growclinic-platform-migrate";

// App registry. connectionLimit is a hard per-role cap enforced by PostgreSQL
// (2× the app's pool so a rolling container replacement still fits) — see
// ARCHITECTURE.md → "Connection budget".
const APPS = [
  { name: "growclinic", kind: "prisma", passwordEnv: "GROWCLINIC_DB_PASSWORD", connectionLimit: 10 },
  { name: "audit",      kind: "sql",    passwordEnv: "AUDIT_DB_PASSWORD",      connectionLimit: 12 },
  { name: "gmb",        kind: "sql",    passwordEnv: "GMB_DB_PASSWORD",        connectionLimit: 10 },
  { name: "engine",     kind: "prisma", passwordEnv: "ENGINE_DB_PASSWORD",     connectionLimit: 10 },
];
const SQL_SCOPES = ["core", "audit", "gmb"]; // order matters: core creates the schemas

const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);
const PG = {
  host: env("POSTGRES_HOST", "postgres"),
  port: Number(env("POSTGRES_PORT", "5432")),
  database: env("POSTGRES_DB", "growclinic"),
  user: env("POSTGRES_SUPERUSER", "gc_admin"),
  password: process.env.POSTGRES_SUPERUSER_PASSWORD,
};

const log = (...a) => console.log("[migrate]", ...a);
const fail = (msg) => { console.error(`[migrate] ERROR: ${msg}`); process.exit(1); };

// Passwords end up inside connection URLs (Compose builds DATABASE_URL), so
// they must be URL-safe and long. scripts/generate-secrets.sh produces hex.
const SAFE_SECRET = /^[A-Za-z0-9._~-]{24,}$/;
function requireSecret(name) {
  const v = process.env[name];
  if (!v) fail(`${name} is not set`);
  if (!SAFE_SECRET.test(v)) fail(`${name} must be ≥24 URL-safe characters [A-Za-z0-9._~-] (use scripts/generate-secrets.sh)`);
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`unsafe identifier: ${s}`);
  return s;
};
const checksum = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

async function connect() {
  if (!PG.password) fail("POSTGRES_SUPERUSER_PASSWORD is not set");
  const deadline = Date.now() + 120_000;
  for (let attempt = 1; ; attempt++) {
    const client = new pg.Client({ ...PG, application_name: "growclinic-migrate" });
    try {
      await client.connect();
      return client;
    } catch (e) {
      await client.end().catch(() => {});
      if (Date.now() > deadline) fail(`cannot connect to PostgreSQL at ${PG.host}:${PG.port}: ${e.message}`);
      log(`waiting for PostgreSQL (attempt ${attempt}): ${e.message}`);
      await sleep(2_000);
    }
  }
}

// ── 1. roles, database privileges, ledger ────────────────────────────────────
async function bootstrap(client) {
  const db = ident(PG.database);
  for (const app of APPS) {
    const owner = ident(`${app.name}_owner`);
    const runtime = ident(`${app.name}_app`);
    const password = requireSecret(app.passwordEnv);

    const { rowCount: ownerExists } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [owner]);
    if (!ownerExists) {
      await client.query(`CREATE ROLE ${owner} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
      log(`created role ${owner}`);
    }
    const { rowCount: appExists } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [runtime]);
    const attrs = `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${Number(app.connectionLimit)} PASSWORD ${client.escapeLiteral(password)}`;
    if (!appExists) {
      await client.query(`CREATE ROLE ${runtime} ${attrs}`);
      log(`created role ${runtime} (connection limit ${app.connectionLimit})`);
    } else {
      await client.query(`ALTER ROLE ${runtime} WITH ${attrs}`); // keeps password/limit in sync with .env
    }
    await client.query(`ALTER ROLE ${runtime} IN DATABASE ${db} SET search_path = ${ident(app.name)}`);
    await client.query(`ALTER ROLE ${runtime} IN DATABASE ${db} SET timezone = 'UTC'`);
    await client.query(`GRANT CONNECT ON DATABASE ${db} TO ${runtime}`);
  }
  // Only the explicitly granted roles may connect.
  await client.query(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`);

  await client.query(`CREATE SCHEMA IF NOT EXISTS core`);
  await client.query(`REVOKE ALL ON SCHEMA core FROM PUBLIC`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS core.schema_migrations (
      scope      text        NOT NULL,
      version    text        NOT NULL,
      checksum   text        NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      applied_by text        NOT NULL DEFAULT current_user,
      PRIMARY KEY (scope, version)
    )`);
}

// ── 2. SQL migrations (core, audit, gmb) ─────────────────────────────────────
function sqlFiles(scope) {
  const dir = join(ROOT, "sql", scope);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      return { scope, version: f.replace(/\.sql$/, ""), text, checksum: checksum(text) };
    });
}

async function ledgerRows(client) {
  const { rows: t } = await client.query("SELECT to_regclass('core.schema_migrations') AS t");
  if (!t[0].t) return new Map();
  const { rows } = await client.query("SELECT scope, version, checksum FROM core.schema_migrations");
  return new Map(rows.map((r) => [`${r.scope}/${r.version}`, r.checksum]));
}

async function sqlMigrations(client, apply) {
  const ledger = await ledgerRows(client);
  let pending = 0;
  for (const scope of SQL_SCOPES) {
    for (const m of sqlFiles(scope)) {
      const key = `${scope}/${m.version}`;
      if (ledger.has(key)) {
        if (ledger.get(key) !== m.checksum) {
          fail(`${key} was already applied but its file has changed (checksum mismatch). Applied migrations are immutable — add a new migration instead.`);
        }
        continue;
      }
      pending++;
      if (!apply) { log(`pending  sql ${key}`); continue; }
      log(`applying sql ${key}`);
      try {
        await client.query("BEGIN");
        if (scope !== "core") {
          await client.query(`SET LOCAL ROLE ${ident(`${scope}_owner`)}`);
          await client.query(`SET LOCAL search_path = ${ident(scope)}`);
        }
        await client.query(m.text);
        await client.query("RESET ROLE");
        await client.query(
          "INSERT INTO core.schema_migrations (scope, version, checksum) VALUES ($1, $2, $3)",
          [scope, m.version, m.checksum]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        fail(`${key} failed and was rolled back: ${e.message}`);
      }
    }
  }
  return pending;
}

// ── 3. Prisma apps (growclinic, engine) ──────────────────────────────────────
function prisma(app, args) {
  const schema = join(ROOT, app, "prisma", "schema.prisma");
  if (!existsSync(schema)) fail(`missing ${schema}`);
  const url = new URL(`postgresql://${PG.host}:${PG.port}/${PG.database}`);
  url.username = PG.user;
  url.password = PG.password;
  url.searchParams.set("schema", app);
  const cli = require.resolve("prisma/build/index.js");
  return spawnSync(process.execPath, [cli, ...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: url.toString(), PRISMA_HIDE_UPDATE_MESSAGE: "1", CHECKPOINT_DISABLE: "1" },
    encoding: "utf8",
  });
}

function prismaMigrations(apply) {
  let pending = 0;
  for (const app of APPS.filter((a) => a.kind === "prisma")) {
    if (apply) {
      log(`prisma migrate deploy — ${app.name}`);
      const r = prisma(app.name, ["migrate", "deploy"]);
      process.stdout.write(r.stdout || "");
      if (r.status !== 0) { process.stderr.write(r.stderr || ""); fail(`prisma migrate deploy failed for ${app.name}`); }
    } else {
      const r = prisma(app.name, ["migrate", "status"]);
      const out = `${r.stdout || ""}${r.stderr || ""}`;
      if (r.status === 0) { log(`prisma ${app.name}: up to date`); continue; }
      pending++;
      log(`prisma ${app.name}: NOT up to date`);
      process.stdout.write(out.split("\n").filter((l) => l.trim() && !/prisma\.io|Update available|│|┌|└/.test(l)).map((l) => `           ${l}`).join("\n") + "\n");
    }
  }
  return pending;
}

// ── 4. ownership + least-privilege grants ────────────────────────────────────
async function normaliseOwnership(client, schema) {
  const owner = `${schema}_owner`;
  const { rows } = await client.query(
    `SELECT format('ALTER %s %I.%I OWNER TO %I',
                   CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
                   n.nspname, c.relname, $2::text) AS stmt
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relkind IN ('r','p','v','m','S')
        AND pg_get_userbyid(c.relowner) <> $2
        AND NOT (c.relkind = 'S' AND EXISTS (SELECT 1 FROM pg_depend d
                  WHERE d.objid = c.oid AND d.deptype IN ('a','i') AND d.classid = 'pg_class'::regclass))
     UNION ALL
     SELECT format('ALTER TYPE %I.%I OWNER TO %I', n.nspname, t.typname, $2::text)
       FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = $1 AND t.typtype IN ('e','d') AND pg_get_userbyid(t.typowner) <> $2
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
     UNION ALL
     SELECT format('ALTER FUNCTION %I.%I(%s) OWNER TO %I', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), $2::text)
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1 AND pg_get_userbyid(p.proowner) <> $2
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')`,
    [schema, owner]
  );
  for (const { stmt } of rows) await client.query(stmt);
  if (rows.length) log(`${schema}: ownership normalised on ${rows.length} object(s) → ${owner}`);
}

async function grants(client) {
  for (const app of APPS) {
    const s = ident(app.name);
    const owner = ident(`${app.name}_owner`);
    const runtime = ident(`${app.name}_app`);
    await normaliseOwnership(client, s);
    await client.query(`GRANT USAGE ON SCHEMA ${s} TO ${runtime}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${s} TO ${runtime}`);
    await client.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${s} TO ${runtime}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA ${s} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtime}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA ${s} GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${runtime}`);
    const overrides = join(ROOT, "privileges", `${app.name}.sql`);
    if (existsSync(overrides)) await client.query(readFileSync(overrides, "utf8"));
  }
  log("grants applied (runtime roles: DML only on their own schema)");
}

// ── main ─────────────────────────────────────────────────────────────────────
const client = await connect();
let exitCode = 0;
try {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
  const { rows: [v] } = await client.query("SHOW server_version");
  log(`mode=${MODE} database=${PG.database} server=${v.server_version}`);

  if (MODE === "apply") {
    await bootstrap(client);
    await sqlMigrations(client, true);
    prismaMigrations(true);
    await grants(client);
    log("database is up to date");
  } else {
    const pending = (await sqlMigrations(client, false)) + prismaMigrations(false);
    if (pending === 0) {
      log("no pending migrations");
    } else if (MODE === "check") {
      console.error(`[migrate] ${pending} migration set(s) pending. Take a backup (scripts/backup.sh), then apply:`);
      console.error("[migrate]   docker compose run --rm -e MIGRATE_MODE=apply migrate");
      exitCode = 1;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]).catch(() => {});
  await client.end();
}
process.exit(exitCode);
