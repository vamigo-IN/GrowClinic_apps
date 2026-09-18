#!/usr/bin/env bash
# Run the platform migrate job explicitly.
#
#   ./scripts/migrate.sh status   # show pending/applied migrations (read-only)
#   ./scripts/migrate.sh check    # exit 1 if anything is pending
#   ./scripts/migrate.sh apply    # apply pending migrations (take a backup first in production)
#
# Forward-only. There is intentionally no reset/drop command in this tool.
set -euo pipefail
cd "$(dirname "$0")/.."

mode="${1:-status}"
case "$mode" in
  apply|status|check) ;;
  *) echo "usage: $0 apply|status|check" >&2; exit 2 ;;
esac

docker compose up -d postgres
docker compose build migrate
docker compose run --rm -e MIGRATE_MODE="$mode" migrate
