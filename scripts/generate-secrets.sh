#!/usr/bin/env bash
# Create .env from .env.example, replacing every CHANGE_ME with a fresh random
# secret. Refuses to overwrite an existing .env (secrets are not rotated
# silently — rotating DB passwords is: edit .env, then `scripts/migrate.sh apply`).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -e .env ]]; then
  echo "✋ .env already exists — not overwriting. Edit it by hand or move it away first." >&2
  exit 1
fi

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    node -e "process.stdout.write(require('crypto').randomBytes($1).toString('hex'))"
  fi
}

umask 077
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^([A-Z0-9_]+)=CHANGE_ME$ ]]; then
    key="${BASH_REMATCH[1]}"
    case "$key" in
      GMB_TOKEN_ENC_KEY) value="$(rand_hex 32)" ;;   # 64 hex chars = raw AES-256 key
      *)                 value="$(rand_hex 24)" ;;   # 48 hex chars, URL-safe
    esac
    printf '%s=%s\n' "$key" "$value"
  else
    printf '%s\n' "$line"
  fi
done < .env.example > .env

echo "✅ .env created with fresh secrets (mode 600)."
echo "   Review AUDIT_*/GMB_*/GROWCLINIC_* integration keys, then:"
echo "   ./scripts/check-ports.sh && docker compose up -d --build"
