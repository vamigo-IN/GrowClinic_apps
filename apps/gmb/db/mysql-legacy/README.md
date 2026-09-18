# MySQL-era schema (reference only)

These files are the original MySQL/MariaDB schema and the ad-hoc `ALTER TABLE`
that Gmb used to run at boot. They are **not used** by the platform.

- The PostgreSQL schema is `database/migrations/gmb/*.sql` at the repository
  root, applied only by the platform `migrate` job.
- `migrate_locations.js` is a MySQL-only one-off (its columns are part of the
  PostgreSQL baseline) and no longer runs as-is.
- Kept so the MySQL → PostgreSQL import (`database/import/`) and
  `DATABASE-MIGRATION.md` can be checked against the source schema.
