#!/usr/bin/env bash
# Import legacy MySQL dumps into the platform PostgreSQL database.
#
#   ./scripts/import-legacy.sh check    # preflight only, changes nothing
#   ./scripts/import-legacy.sh run      # backup, load, import, validate
#   ./scripts/import-legacy.sh status   # dumps present + target row counts
#
# Expects mysqldump output at database/import/dumps/<app>.dump.sql for
# growclinic, audit and gmb (produced on the OLD host by SSH or phpMyAdmin —
# see DATABASE-MIGRATION.md §8). This script holds no credentials: it reads
# the dumps from disk and connects to PostgreSQL with the platform's own
# POSTGRES_SUPERUSER from .env.
#
# The engine app is new and has no legacy database, so it is never imported.
#
# Time zones: audit and gmb store naive MySQL DATETIME values. Export the real
# source offset before running, or UTC is assumed and every timestamp shifts:
#   IMPORT_AUDIT_SOURCE_TZ=+05:30 IMPORT_GMB_SOURCE_TZ=+05:30 ./scripts/import-legacy.sh run
# Find it on the old server with:  SELECT @@global.time_zone, NOW(), UTC_TIMESTAMP();
set -uo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1

DUMPS="database/import/dumps"
APPS="growclinic,audit,gmb"
APP_LIST=(growclinic audit gmb)
COMPOSE=(docker compose -f docker-compose.yml -f compose.import.yml --profile import)

red() { printf '\033[31m%s\033[0m\n' "$*"; }
grn() { printf '\033[32m%s\033[0m\n' "$*"; }
ylw() { printf '\033[33m%s\033[0m\n' "$*"; }
die() { red "ERROR: $*"; exit 1; }
step() { printf '\n\033[1m-- %s\033[0m\n' "$*"; }
bytes() { wc -c < "$1" | tr -d ' '; }

su_user() { grep -E '^POSTGRES_SUPERUSER=' .env | tail -1 | cut -d= -f2-; }
db_name() { grep -E '^POSTGRES_DB=' .env | tail -1 | cut -d= -f2-; }
psqlc() { docker compose exec -T postgres psql -U "$(su_user)" -d "$(db_name)" -Atc "$1"; }

# Tables the importer writes first for each app. If any holds rows the import
# is refused, so check them up front rather than after taking a backup.
OCCUPANCY_SQL="
  SELECT string_agg(t, ', ' ORDER BY t) FROM (
    SELECT 'growclinic.User' t WHERE EXISTS (SELECT 1 FROM growclinic.\"User\")
    UNION ALL SELECT 'growclinic.Post'      WHERE EXISTS (SELECT 1 FROM growclinic.\"Post\")
    UNION ALL SELECT 'growclinic.Tag'       WHERE EXISTS (SELECT 1 FROM growclinic.\"Tag\")
    UNION ALL SELECT 'growclinic.CaseStudy' WHERE EXISTS (SELECT 1 FROM growclinic.\"CaseStudy\")
    UNION ALL SELECT 'audit.leads'          WHERE EXISTS (SELECT 1 FROM audit.leads)
    UNION ALL SELECT 'audit.admin_users'    WHERE EXISTS (SELECT 1 FROM audit.admin_users)
    UNION ALL SELECT 'audit.chat_sessions'  WHERE EXISTS (SELECT 1 FROM audit.chat_sessions)
    UNION ALL SELECT 'gmb.users'            WHERE EXISTS (SELECT 1 FROM gmb.users)
    UNION ALL SELECT 'gmb.organizations'    WHERE EXISTS (SELECT 1 FROM gmb.organizations)
  ) s"

preflight() {
  [[ -f .env ]] || die ".env not found - run this from the platform checkout"
  [[ -f compose.import.yml ]] || die "compose.import.yml not found"

  step "Dumps"
  local app missing=0
  for app in "${APP_LIST[@]}"; do
    if [[ -s "$DUMPS/$app.dump.sql" ]]; then
      if grep -qm1 "CREATE TABLE" "$DUMPS/$app.dump.sql"; then
        printf '  %-11s ok  (%s bytes)\n' "$app" "$(bytes "$DUMPS/$app.dump.sql")"
      else
        red "  $app  no CREATE TABLE found - truncated or permission-denied export"
        missing=1
      fi
    else
      red "  $app  MISSING"
      missing=1
    fi
  done
  # Without a dump the import-source container loads the bundled FIXTURES, which
  # would put fabricated rows into the production database. Never allow that.
  (( missing )) && die "every app needs a real dump - a missing one would import FIXTURE data"
  [[ -e "$DUMPS/engine.dump.sql" ]] && die "unexpected $DUMPS/engine.dump.sql - the engine app has no legacy data"

  step "Source time zones (naive MySQL DATETIME -> timestamptz)"
  printf '  audit=%s  gmb=%s\n' "${IMPORT_AUDIT_SOURCE_TZ:-+00:00}" "${IMPORT_GMB_SOURCE_TZ:-+00:00}"
  if [[ -z "${IMPORT_AUDIT_SOURCE_TZ:-}" || -z "${IMPORT_GMB_SOURCE_TZ:-}" ]]; then
    ylw "  UTC assumed. If the old MySQL server was not on UTC, stop and re-run with"
    ylw "  IMPORT_AUDIT_SOURCE_TZ / IMPORT_GMB_SOURCE_TZ set, or timestamps will shift."
  fi

  step "Target"
  docker compose ps --status running --services 2>/dev/null | grep -qx postgres \
    || die "postgres is not running - start it with 'docker compose up -d postgres'"
  local occupied
  occupied="$(psqlc "$OCCUPANCY_SQL" 2>/dev/null | tr -d '\r')"
  if [[ -n "$occupied" ]]; then
    red "  these target tables already contain rows:"
    printf '    %s\n' "$occupied"
    ylw "  The importer refuses non-empty tables so it can never duplicate data."
    ylw "  On a new deployment these rows come from the seed jobs - do not seed"
    ylw "  before importing; the real accounts arrive with the legacy data."
    die "target is not empty"
  fi
  grn "  empty, ready to receive"
}

cmd_run() {
  preflight

  step "1/5  Target schema (no-op if already migrated)"
  ./scripts/migrate.sh apply || die "migration failed"

  step "2/5  Backup BEFORE any import"
  ./scripts/backup.sh || die "backup failed - refusing to import without a restore point"

  step "3/5  Throwaway MySQL source, restoring the dumps"
  "${COMPOSE[@]}" up -d import-mysql || die "could not start import-mysql"
  printf '  waiting for the dumps to load '
  local i state ready=0
  for i in $(seq 1 180); do
    state="$(docker inspect -f '{{.State.Health.Status}}' growclinic-import-mysql-1 2>/dev/null)"
    if [[ "$state" == healthy ]]; then ready=1; grn "ready"; break; fi
    printf '.'
    command sleep 5
  done
  if (( ! ready )); then
    red "timeout"
    "${COMPOSE[@]}" logs --tail 40 import-mysql
    teardown
    die "import-mysql never became healthy - check the dumps are valid mysqldump output"
  fi

  step "4/5  Importing $APPS (one transaction per app)"
  if ! "${COMPOSE[@]}" run --rm import import --apps "$APPS"; then
    teardown
    die "import failed - each app is all-or-nothing, so nothing partial was committed"
  fi

  step "5/5  Validating (row counts + primary-key digests on both sides)"
  if ! "${COMPOSE[@]}" run --rm import validate --apps "$APPS"; then
    teardown
    die "VALIDATION FAILED - do not go live; restore from the backup taken in step 2"
  fi

  teardown
  grn ""
  grn "Import complete and validated."
  ylw "Next: docker compose up -d, log in with a real account from the old system,"
  ylw "then delete the dumps in $DUMPS/ - they contain personal data."
}

teardown() {
  step "Removing the throwaway MySQL source"
  "${COMPOSE[@]}" rm -sf import-mysql > /dev/null 2>&1 || true
}

cmd_status() {
  step "Dumps"
  local app
  for app in "${APP_LIST[@]}"; do
    if [[ -s "$DUMPS/$app.dump.sql" ]]; then
      printf '  %-11s %s bytes\n' "$app" "$(bytes "$DUMPS/$app.dump.sql")"
    else
      printf '  %-11s absent\n' "$app"
    fi
  done
  step "Row counts in PostgreSQL"
  psqlc "
    SELECT 'growclinic.User', count(*) FROM growclinic.\"User\"
    UNION ALL SELECT 'growclinic.Post', count(*) FROM growclinic.\"Post\"
    UNION ALL SELECT 'growclinic.CaseStudy', count(*) FROM growclinic.\"CaseStudy\"
    UNION ALL SELECT 'audit.leads', count(*) FROM audit.leads
    UNION ALL SELECT 'audit.chat_sessions', count(*) FROM audit.chat_sessions
    UNION ALL SELECT 'audit.admin_users', count(*) FROM audit.admin_users
    UNION ALL SELECT 'gmb.users', count(*) FROM gmb.users
    UNION ALL SELECT 'gmb.organizations', count(*) FROM gmb.organizations
    UNION ALL SELECT 'gmb.locations', count(*) FROM gmb.locations" 2>/dev/null \
    | sed 's/^/  /' || echo "  (postgres not running)"
}

case "${1:-}" in
  check)  preflight; grn ""; grn "Preflight passed - './scripts/import-legacy.sh run' will import." ;;
  run)    cmd_run ;;
  status) cmd_status ;;
  *)      sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^#\{1,\} \{0,1\}//'; exit 2 ;;
esac
