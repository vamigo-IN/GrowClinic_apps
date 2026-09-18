#!/usr/bin/env bash
# Back up everything that cannot be rebuilt from git:
#   • PostgreSQL database (pg_dump custom format, verified with pg_restore --list)
#   • PostgreSQL roles (pg_dumpall --globals-only; contains password hashes)
#   • growclinic_uploads volume (admin-uploaded images)
#   • audit_data volume (generated audit reports, leads.json, .admin-password)
#
#   ./scripts/backup.sh                     # → backups/<timestamp>/
#   BACKUP_DIR=/opt/backups/growclinic BACKUP_RETENTION_DAYS=14 ./scripts/backup.sh
#
# Read-only against the running stack. Docker volumes are NOT a backup — copy
# the resulting directory off the server (see ARCHITECTURE.md → Backups).
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1   # Git Bash (Windows): keep container paths like /backup untouched
# Host directory in the form Docker expects (D:/… under Git Bash, /… elsewhere).
hostdir() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

[[ -f .env ]] || { echo ".env not found" >&2; exit 1; }
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' .env | tail -1 | cut -d= -f2-)"; POSTGRES_DB="${POSTGRES_DB:-growclinic}"
POSTGRES_SUPERUSER="$(grep -E '^POSTGRES_SUPERUSER=' .env | tail -1 | cut -d= -f2-)"; POSTGRES_SUPERUSER="${POSTGRES_SUPERUSER:-gc_admin}"
PROJECT="growclinic"   # `name:` in docker-compose.yml — the volume name prefix

BACKUP_ROOT="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
umask 077
mkdir -p "$DEST"

echo "▶ PostgreSQL dump (${POSTGRES_DB})"
docker compose exec -T postgres pg_dump -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" -Fc --no-password \
  > "$DEST/${POSTGRES_DB}.dump"
docker compose exec -T postgres pg_restore --list < "$DEST/${POSTGRES_DB}.dump" > "$DEST/${POSTGRES_DB}.toc"
echo "  ✓ $(wc -l < "$DEST/${POSTGRES_DB}.toc") TOC entries verified"

echo "▶ PostgreSQL roles (globals)"
docker compose exec -T postgres pg_dumpall -U "$POSTGRES_SUPERUSER" --globals-only --no-password \
  > "$DEST/globals.sql"

for vol in growclinic_uploads audit_data; do
  full="${PROJECT}_${vol}"
  if docker volume inspect "$full" >/dev/null 2>&1; then
    echo "▶ volume ${full}"
    docker run --rm -v "${full}:/source:ro" -v "$(hostdir "$DEST"):/backup" alpine:3.20 \
      tar czf "/backup/${vol}.tar.gz" -C /source .
  fi
done

( cd "$DEST" && sha256sum ./* > SHA256SUMS 2>/dev/null || shasum -a 256 ./* > SHA256SUMS )
echo "✅ backup complete: $DEST"
du -sh "$DEST" 2>/dev/null || true

# Retention: only timestamped directories inside BACKUP_ROOT are ever removed.
if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} + \
    | sed 's/^/  pruned old backup: /' || true
fi
