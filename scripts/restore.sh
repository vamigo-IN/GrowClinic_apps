#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh.
#
# DEFAULT (non-destructive): restore the dump into a NEW scratch database
# "<db>_restore_check" and print per-schema row counts, so a backup can be
# verified without touching live data:
#   ./scripts/restore.sh backups/20260917T120000Z
#
# DESTRUCTIVE: replace the live database and volumes. Stops the apps, requires
# typing the database name, and is never run by any other script:
#   ./scripts/restore.sh backups/20260917T120000Z --replace-live
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1   # Git Bash (Windows): keep container paths like /backup untouched
# Host directory in the form Docker expects (D:/… under Git Bash, /… elsewhere).
hostdir() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

SRC="${1:-}"; MODE="${2:-verify}"
[[ -n "$SRC" && -d "$SRC" ]] || { echo "usage: $0 <backup-dir> [--replace-live]" >&2; exit 2; }
[[ -f .env ]] || { echo ".env not found" >&2; exit 1; }
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' .env | tail -1 | cut -d= -f2-)"; POSTGRES_DB="${POSTGRES_DB:-growclinic}"
POSTGRES_SUPERUSER="$(grep -E '^POSTGRES_SUPERUSER=' .env | tail -1 | cut -d= -f2-)"; POSTGRES_SUPERUSER="${POSTGRES_SUPERUSER:-gc_admin}"
DUMP="$SRC/${POSTGRES_DB}.dump"
[[ -f "$DUMP" ]] || { echo "missing $DUMP" >&2; exit 1; }
( cd "$SRC" && { sha256sum -c SHA256SUMS --quiet 2>/dev/null || shasum -a 256 -c SHA256SUMS --quiet; } ) \
  || { echo "❌ checksum verification failed for $SRC" >&2; exit 1; }

psql_admin() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_SUPERUSER" "$@"; }

row_counts() {
  psql_admin -d "$1" -Atc "
    SELECT format('%-12s %-28s %s', schemaname, relname, n_live_tup)
      FROM pg_stat_user_tables ORDER BY schemaname, relname;"
}

if [[ "$MODE" != "--replace-live" ]]; then
  CHECK_DB="${POSTGRES_DB}_restore_check"
  echo "▶ verifying backup into scratch database ${CHECK_DB} (live data untouched)"
  psql_admin -d postgres -c "DROP DATABASE IF EXISTS ${CHECK_DB} WITH (FORCE);" >/dev/null
  psql_admin -d postgres -c "CREATE DATABASE ${CHECK_DB};" >/dev/null
  docker compose exec -T postgres pg_restore -U "$POSTGRES_SUPERUSER" -d "$CHECK_DB" --no-owner --no-acl --exit-on-error < "$DUMP"
  psql_admin -d "$CHECK_DB" -c "ANALYZE;" >/dev/null
  row_counts "$CHECK_DB"
  echo "✅ backup restores cleanly. Drop the scratch DB when done:"
  echo "   docker compose exec postgres psql -U $POSTGRES_SUPERUSER -d postgres -c 'DROP DATABASE ${CHECK_DB};'"
  exit 0
fi

echo "⚠️  DESTRUCTIVE RESTORE — this replaces database '${POSTGRES_DB}' and the"
echo "    growclinic_uploads / audit_data volumes with the contents of ${SRC}."
echo "    Take a fresh backup first (./scripts/backup.sh) if the live data matters."
read -r -p "Type the database name (${POSTGRES_DB}) to continue: " answer
[[ "$answer" == "$POSTGRES_DB" ]] || { echo "aborted"; exit 1; }

echo "▶ stopping applications"
docker compose stop growclinic audit gmb engine

echo "▶ restoring roles (globals) — existing roles are kept"
psql_admin -d postgres -f - < "$SRC/globals.sql" 2>&1 | grep -v "already exists" || true

echo "▶ restoring database"
docker compose exec -T postgres pg_restore -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" \
  --clean --if-exists --exit-on-error < "$DUMP"

PROJECT="growclinic"
for vol in growclinic_uploads audit_data; do
  if [[ -f "$SRC/${vol}.tar.gz" ]]; then
    echo "▶ restoring volume ${PROJECT}_${vol}"
    docker run --rm -v "${PROJECT}_${vol}:/target" -v "$(hostdir "$SRC"):/backup:ro" alpine:3.20 \
      sh -c 'find /target -mindepth 1 -delete && tar xzf "/backup/'"${vol}"'.tar.gz" -C /target && chown -R 1000:1000 /target'
  fi
done

echo "▶ re-syncing roles/grants and applying any newer migrations"
docker compose run --rm -e MIGRATE_MODE=apply migrate

echo "▶ starting applications"
docker compose up -d growclinic audit gmb engine
echo "✅ restore complete"
