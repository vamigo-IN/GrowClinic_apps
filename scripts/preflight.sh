#!/usr/bin/env bash
# Production readiness check for .env + Compose. Read-only: changes nothing.
#
#   ./scripts/preflight.sh            # run on the production host before `docker compose up`
#
# Exit 0 = ready (warnings may still be printed); 1 = at least one blocking error.
set -uo pipefail
cd "$(dirname "$0")/.."

ERR=0; WARN=0
fail() { ERR=$((ERR+1)); printf '  ❌ %s\n' "$1"; }
warn() { WARN=$((WARN+1)); printf '  ⚠️  %s\n' "$1"; }
pass() { printf '  ✅ %s\n' "$1"; }

[[ -f .env ]] || { echo "❌ .env not found — create it with ./scripts/generate-secrets.sh"; exit 1; }
envv() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }

echo "▶ .env file"
if stat -c '%a' .env >/dev/null 2>&1; then
  mode="$(stat -c '%a' .env)"
  [[ "$mode" == 600 || "$mode" == 400 ]] && pass ".env mode $mode" || fail ".env mode is $mode — run: chmod 600 .env"
fi
if grep -qE '=CHANGE_ME$' .env; then
  fail "placeholders left: $(grep -E '=CHANGE_ME$' .env | cut -d= -f1 | tr '\n' ' ')"
else
  pass "no CHANGE_ME placeholders"
fi

echo "▶ secrets"
need() { # name min_length [urlsafe]
  local v; v="$(envv "$1")"
  if [[ -z "$v" ]]; then fail "$1 is empty"; return; fi
  if (( ${#v} < $2 )); then fail "$1 is shorter than $2 characters"; return; fi
  if [[ "${3:-}" == urlsafe && ! "$v" =~ ^[A-Za-z0-9._~-]+$ ]]; then fail "$1 must be URL-safe ([A-Za-z0-9._~-]) — it is used inside a connection URL"; return; fi
  pass "$1"
}
need POSTGRES_SUPERUSER_PASSWORD 24 urlsafe
need GROWCLINIC_DB_PASSWORD 24 urlsafe
need AUDIT_DB_PASSWORD 24 urlsafe
need GMB_DB_PASSWORD 24 urlsafe
need ENGINE_DB_PASSWORD 24 urlsafe
need REDIS_AUDIT_PASSWORD 24 urlsafe
need REDIS_GMB_PASSWORD 24 urlsafe
need GROWCLINIC_AUTH_SECRET 32
need AUDIT_INTAKE_SECRET 24
need AUDIT_INBOUND_LEADS_KEY 12
need AUDIT_MAINTENANCE_ACCESS_CODE 12
need GMB_TOKEN_ENC_KEY 32
need GMB_INBOUND_HANDOFF_KEY 16
cal="$(envv GROWCLINIC_CAL_WEBHOOK_SECRET)"
if [[ -z "$cal" ]]; then warn "GROWCLINIC_CAL_WEBHOOK_SECRET is empty — the Cal.com webhook will answer 503"
elif (( ${#cal} < 16 )) || [[ "$cal" == vamigo ]]; then fail "GROWCLINIC_CAL_WEBHOOK_SECRET is weak or the old public default — use 16+ random chars (and set it in Cal.com)"
else pass "GROWCLINIC_CAL_WEBHOOK_SECRET"; fi
for k in GMB_WHATSAPP_API_URL GMB_WHATSAPP_API_TOKEN; do
  [[ "$(envv "$k")" == TEST ]] && fail "$k is the local placeholder 'TEST'"
done
for k in GROWCLINIC_SEED_ADMIN_PASSWORD ENGINE_SEED_ADMIN_PASSWORD AUDIT_ADMIN_INITIAL_PASSWORD; do
  [[ -n "$(envv "$k")" ]] && warn "$k is set — clear it once the admin account exists"
done

echo "▶ production switches"
[[ "$(envv MIGRATE_MODE)" == check ]] && pass "MIGRATE_MODE=check" \
  || fail "MIGRATE_MODE must be 'check' in production (apply migrations explicitly after a backup)"
for k in GMB_OTP_TEST_MODE GMB_USE_MOCK_GOOGLE_API AUDIT_ADMIN_DISABLE_2FA; do
  [[ -z "$(envv "$k")" ]] && pass "$k is empty" || fail "$k must be empty in production"
done
[[ "$(envv GROWCLINIC_INDEXNOW_ENABLED)" == true ]] && pass "GROWCLINIC_INDEXNOW_ENABLED=true" \
  || warn "GROWCLINIC_INDEXNOW_ENABLED is not 'true' — published posts won't be pinged to Bing"

echo "▶ public URLs"
url_https() { # name [exact]
  local v; v="$(envv "$1")"
  if [[ "$v" != https://* ]]; then fail "$1 must be an https:// URL (is '${v}')"; return; fi
  if [[ "$v" == *localhost* || "$v" == *.local* || "$v" == *127.0.0.1* ]]; then fail "$1 points at a local host ('$v')"; return; fi
  if [[ -n "${2:-}" && "$v" != "$2" ]]; then warn "$1 is '$v' (expected $2)"; return; fi
  pass "$1=$v"
}
url_https GROWCLINIC_PUBLIC_URL https://www.growclinic.io
url_https GROWCLINIC_AUTH_URL https://www.growclinic.io
url_https AUDIT_PUBLIC_URL https://audit.growclinic.io
url_https GMB_GOOGLE_REDIRECT_URI https://gmb.growclinic.io/api/google/callback
origins="$(envv AUDIT_PUBLIC_ORIGIN)"
if [[ -z "$origins" ]]; then fail "AUDIT_PUBLIC_ORIGIN is empty"
elif [[ "$origins" == *localhost* || "$origins" == *http://* ]]; then fail "AUDIT_PUBLIC_ORIGIN must list https origins only ('$origins')"
else pass "AUDIT_PUBLIC_ORIGIN=$origins"; fi

echo "▶ host binding"
bind="$(envv PROXY_HTTP_BIND)"
if [[ "$bind" =~ ^127\.0\.0\.1:([0-9]+)$ ]]; then
  pass "PROXY_HTTP_BIND is loopback ($bind)"
  ./scripts/check-ports.sh "${BASH_REMATCH[1]}" >/dev/null 2>&1 \
    && pass "port ${BASH_REMATCH[1]} is free and not reserved" \
    || { running="$(docker compose ps -q reverse-proxy 2>/dev/null)"
         [[ -n "$running" ]] && warn "port ${BASH_REMATCH[1]} is in use — expected only if this platform's proxy is already running" \
                             || fail "port ${BASH_REMATCH[1]} is in use or reserved — run ./scripts/check-ports.sh ${BASH_REMATCH[1]}"; }
else
  fail "PROXY_HTTP_BIND must be 127.0.0.1:<port> (is '$bind') — the VPS Nginx owns the public ports"
fi

echo "▶ compose"
if command -v docker >/dev/null 2>&1; then
  docker compose config --quiet 2>/dev/null && pass "docker compose config is valid" || fail "docker compose config failed"
else
  warn "docker not found — skipped compose validation"
fi

echo
if (( ERR > 0 )); then
  echo "❌ not ready: $ERR error(s), $WARN warning(s)"
  exit 1
fi
echo "✅ ready: 0 errors, $WARN warning(s)"
