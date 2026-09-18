#!/bin/bash
# MySQL entrypoint init script for the import source (compose.import.yml).
# Creates one database per application and loads, in order:
#   1. schema  — $IMPORT_SCHEMA_DIR/<app>.sql  (the app's MySQL-era DDL)
#   2. data    — $IMPORT_DATA_DIR/<app>-data.sql or <app>.dump.sql if present
# For a real migration, put restored production dumps (mysqldump output that
# already contains CREATE TABLE statements) in database/import/dumps/<app>.dump.sql
# and they are loaded instead of the fixture schema + data.
set -euo pipefail
MYSQL=(mysql --protocol=socket -uroot "-p${MYSQL_ROOT_PASSWORD}" --default-character-set=utf8mb4)

for app in growclinic audit gmb engine; do
  db="gc_${app}"
  echo "[import-source] creating ${db}"
  "${MYSQL[@]}" -e "CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  "${MYSQL[@]}" -e "GRANT SELECT ON \`${db}\`.* TO '${MYSQL_USER}'@'%';"

  if [[ -f "/import/dumps/${app}.dump.sql" ]]; then
    echo "[import-source] loading real dump for ${app}"
    "${MYSQL[@]}" "${db}" < "/import/dumps/${app}.dump.sql"
    continue
  fi
  echo "[import-source] loading fixture schema + data for ${app}"
  "${MYSQL[@]}" "${db}" < "/import/schema/${app}.sql"
  # e.g. gmb's ad-hoc alter_locations.sql that used to run at boot
  if [[ -f "/import/schema/${app}-alter.sql" ]]; then
    "${MYSQL[@]}" "${db}" < "/import/schema/${app}-alter.sql"
  fi
  if [[ -f "/import/fixtures/${app}-data.sql" ]]; then
    "${MYSQL[@]}" "${db}" < "/import/fixtures/${app}-data.sql"
  else
    echo "[import-source] no dump or fixture data for ${app} — schema only (nothing to import)"
  fi
done
"${MYSQL[@]}" -e "FLUSH PRIVILEGES;"
echo "[import-source] ready"
