#!/usr/bin/env bash
# Verify host ports are free BEFORE binding them. Never kills anything.
#
#   ./scripts/check-ports.sh                 # checks the port in PROXY_HTTP_BIND (.env) or 18080
#   ./scripts/check-ports.sh 18080 18443     # explicit ports
#
# Exit 0 = all free and allowed; 1 = at least one occupied or reserved.
# Uses `ss -lntup` (Linux; run with sudo on the VPS to see process names),
# falling back to lsof or netstat (macOS / Windows Git Bash).
set -uo pipefail
cd "$(dirname "$0")/.."

# Ports observed in use on the production Hostinger VPS (`sudo ss -tulpn`).
# The platform must never bind these, even if they look free locally.
RESERVED_PRODUCTION_PORTS=(22 80 443 3000 3001 3050 5001 5050 5432 5433 5678 6379 8090 8091 8087 65529)

ports=("$@")
if [[ ${#ports[@]} -eq 0 ]]; then
  bind="$(grep -E '^PROXY_HTTP_BIND=' .env 2>/dev/null | tail -1 | cut -d= -f2-)"
  ports=("${bind##*:}")
  [[ -z "${ports[0]}" ]] && ports=(18080)
fi

listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -H -lntup 2>/dev/null | awk '{print $5}' | grep -Eq "[:.]${port}$"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || lsof -nP -iUDP:"$port" >/dev/null 2>&1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ano 2>/dev/null | grep -Ei "listening|udp" | awk '{print $2}' | grep -Eq "[:.]${port}$"
  else
    echo "⚠️  none of ss/lsof/netstat available — cannot verify port $port" >&2
    return 2
  fi
}

status=0
for p in "${ports[@]}"; do
  if ! [[ "$p" =~ ^[0-9]+$ ]] || (( p < 1 || p > 65535 )); then
    echo "❌ '$p' is not a valid port"; status=1; continue
  fi
  for r in "${RESERVED_PRODUCTION_PORTS[@]}"; do
    if [[ "$p" == "$r" ]]; then
      echo "❌ $p is in use on the production VPS — choose a different port"; status=1; continue 2
    fi
  done
  listening "$p"; rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "❌ $p is already in use on this host:"
    (command -v ss >/dev/null && ss -lntup 2>/dev/null | grep -E "[:.]${p}\b") \
      || (command -v lsof >/dev/null && lsof -nP -i :"$p") \
      || (command -v netstat >/dev/null && netstat -ano | grep -E "[:.]${p}\b")
    echo "   Do not stop that process — pick another free high port and update .env."
    status=1
  elif [[ $rc -eq 2 ]]; then
    status=1
  else
    echo "✅ $p is free"
  fi
done
exit $status
