-- ============================================================================
-- core/0001 — platform schemas, extensions, database-wide defaults
--
-- Runs as the database superuser (POSTGRES_SUPERUSER) inside the migrate job,
-- AFTER the migrator's role bootstrap has created:
--   <app>_owner  NOLOGIN  owns the app's schema and every object in it
--   <app>_app    LOGIN    runtime role used by the app (DML only)
-- for app in (growclinic, audit, gmb, engine).
--
-- One database ("growclinic"), one schema per application + `core` for
-- genuinely platform-wide objects. No cross-application tables are created
-- here on purpose — see DATABASE-MIGRATION.md §4 (shared entities).
-- ============================================================================

-- Nothing is created in `public`; nobody but the superuser may use it.
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Application schemas, each owned by its NOLOGIN owner role.
CREATE SCHEMA IF NOT EXISTS growclinic AUTHORIZATION growclinic_owner;
CREATE SCHEMA IF NOT EXISTS audit      AUTHORIZATION audit_owner;
CREATE SCHEMA IF NOT EXISTS gmb        AUTHORIZATION gmb_owner;
CREATE SCHEMA IF NOT EXISTS engine     AUTHORIZATION engine_owner;

-- Runtime roles may only use their own schema.
GRANT USAGE ON SCHEMA growclinic TO growclinic_app;
GRANT USAGE ON SCHEMA audit      TO audit_app;
GRANT USAGE ON SCHEMA gmb        TO gmb_app;
GRANT USAGE ON SCHEMA engine     TO engine_app;

-- citext: case-insensitive text for GrowClinic identity columns (login email,
-- slugs, tag names) — reproduces the MySQL utf8mb4_*_ci collation semantics
-- those columns relied on. An extension exists once per database, so it lives
-- in the only schema that uses it (Prisma sets search_path to its schema).
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA growclinic;

-- Every application stored UTC; make it the database default too.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END $$;
