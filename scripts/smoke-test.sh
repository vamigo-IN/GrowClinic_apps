#!/usr/bin/env bash
# End-to-end smoke tests for the LOCAL platform, through the reverse proxy.
#
#   ./scripts/smoke-test.sh
#
# Requires: bash, curl, node (JSON/HMAC helpers), docker compose; a running
# stack (`docker compose up -d`) and the GrowClinic QA admin seeded
# (`docker compose --profile tools run --rm growclinic-seed`).
# Writes test rows (all tagged "smoke"/"QA") into the LOCAL database.
# NEVER run against production.
#
# Re-running within 10 minutes: the GMB OTP routes are capped per IP at 10
# requests / 10 min by an in-memory limiter, and one run spends 6. Reset it with
# `docker compose restart gmb` before a second run, or the OTP checks fail.
set -uo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: don't rewrite /data/... container paths

[[ -f .env ]] || { echo ".env missing"; exit 1; }
envv() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
if [[ "$(envv PROXY_HTTP_BIND)" != 127.0.0.1:* ]]; then echo "refusing: PROXY_HTTP_BIND is not a loopback address"; exit 1; fi
PORT="$(envv PROXY_HTTP_BIND)"; PORT="${PORT##*:}"
GC="http://growclinic.localhost:${PORT}"; AU="http://audit.growclinic.localhost:${PORT}"
GM="http://gmb.growclinic.localhost:${PORT}"; EN="http://engine.growclinic.localhost:${PORT}"
TMP="$(mktemp -d)"
# Git Bash: native curl/node need C:/ paths once MSYS path conversion is off.
command -v cygpath >/dev/null 2>&1 && TMP="$(cygpath -m "$TMP")"
trap 'rm -rf "$TMP"' EXIT
RUN="$(date +%s)"
PASS=0; FAIL=0; FAILED=()

ok()   { PASS=$((PASS+1)); printf '  ✔ %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); FAILED+=("$1"); printf '  ✘ %s\n' "$1"; [[ -n "${2:-}" ]] && printf '      %s\n' "${2:0:300}"; }
check(){ local name="$1" cond="$2" detail="${3:-}"; if eval "$cond"; then ok "$name"; else bad "$name" "$detail"; fi; }
# json <file-or-string> <js expression on `j`>
json() { node -e 'const fs=require("fs");const a=process.argv[1];let s;try{s=fs.existsSync(a)?fs.readFileSync(a,"utf8"):a}catch{s=a};let j;try{j=JSON.parse(s)}catch{j=null};const v=(()=>{try{return eval(process.argv[2])}catch{return undefined}})();process.stdout.write(v===undefined||v===null?"":String(v))' "$1" "$2"; }
code() { curl -s -o "$TMP/body" -w '%{http_code}' "$@"; }
psql_admin() { docker compose exec -T postgres psql -U "$(envv POSTGRES_SUPERUSER)" -d "$(envv POSTGRES_DB)" -Atc "$1"; }
# Secure cookies (NODE_ENV=production) are not stored by curl over plain http,
# so session cookies are read from Set-Cookie headers and sent explicitly.
setcookie() { grep -i "^set-cookie: $1=" "$2" | head -1 | sed -E "s/^[Ss]et-[Cc]ookie: $1=([^;]*).*/\1/" | tr -d '\r'; }
hostpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
unpublished() { [[ "$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$1")" == "{}" ]]; }

echo "▶ platform"
check "reverse proxy /healthz" '[[ "$(curl -s http://127.0.0.1:${PORT}/healthz)" == ok* ]]'
check "unknown Host is refused" '[[ "$(curl -s -o "$TMP/null" -w "%{http_code}" -H "Host: evil.example" http://127.0.0.1:${PORT}/)" == 000 ]]'
unhealthy="$(docker compose ps --format '{{.Service}} {{.Health}}' | grep -Ev ' healthy$|^migrate ' || true)"
check "all long-running services healthy" '[[ -z "$unhealthy" ]]' "$unhealthy"
check "postgres not published on host" 'unpublished growclinic-postgres-1'
check "redis not published on host" 'unpublished growclinic-redis-1'
check "apps not published on host" 'unpublished growclinic-growclinic-1 && unpublished growclinic-audit-1 && unpublished growclinic-gmb-1 && unpublished growclinic-engine-1'
schemas="$(psql_admin "SELECT string_agg(nspname, ',' ORDER BY nspname) FROM pg_namespace WHERE nspname IN ('core','growclinic','audit','gmb','engine')")"
dbs="$(psql_admin "SELECT count(*) FROM pg_database WHERE datname = '$(envv POSTGRES_DB)'")"
check "one PostgreSQL database with platform schemas" '[[ "$schemas" == "audit,core,engine,gmb,growclinic" && "$dbs" == 1 ]]' "$schemas"

# ─────────────────────────────────────────────────────────────────────────────
echo "▶ www.growclinic.io (apps/GrowClinic-main)"
J="$TMP/gc.jar"
c=$(code "$GC/"); check "homepage 200 (DB-backed layout, testimonials, case studies, logos)" '[[ $c == 200 ]]'
check "canonical URL is https://www.growclinic.io" 'grep -q "<link rel=\"canonical\" href=\"https://www.growclinic.io\"" "$TMP/body"'
for p in /about /audit /blog /case-studies /testimonials /specialties /specialties/dental /digital-marketing-for-clinics /faq /contact /privacy /refund /terms /instagram /sync /llms.txt; do
  c=$(code "$GC$p"); check "GET $p → 200" '[[ $c == 200 ]]'
done
loc=$(curl -s -o "$TMP/null" -w '%{http_code} %{redirect_url}' "$GC/book"); check "/book → /contact (booking retired in-app)" '[[ "$loc" == "307 $GC/contact" ]]' "$loc"
for r in "/home|/" "/digital-marketing-for-clinics-get-more-patients-online|/digital-marketing-for-clinics" "/category/dentist-marketing|/specialties/dental" "/tag/anything|/blog" "/teams/someone|/about"; do
  loc=$(curl -s -o "$TMP/null" -w '%{http_code} %{redirect_url}' "$GC${r%%|*}"); check "legacy WordPress URL ${r%%|*} → 308 ${r##*|}" '[[ "$loc" == "308 $GC${r##*|}" ]]' "$loc"
done
loc=$(curl -s -o "$TMP/null" -w '%{http_code} %{redirect_url}' -H "Host: growclinic.io" "http://127.0.0.1:${PORT}/blog?x=1")
check "apex growclinic.io → 301 https://www.growclinic.io (path + query kept)" '[[ "$loc" == "301 https://www.growclinic.io/blog?x=1" ]]' "$loc"
c=$(code -H "Host: www.growclinic.io" "http://127.0.0.1:${PORT}/about"); check "www.growclinic.io host served" '[[ $c == 200 ]]'
c=$(code "$GC/robots.txt"); check "robots.txt disallows /admin/ and points at the www sitemap" '[[ $c == 200 ]] && grep -q "Disallow: /admin/" "$TMP/body" && grep -q "https://www.growclinic.io/sitemap.xml" "$TMP/body"'
c=$(code "$GC/sitemap.xml"); check "sitemap.xml rendered from the DB (seeded posts listed)" '[[ $c == 200 ]] && grep -q "https://www.growclinic.io/blog/google-business-profile-clinic-growth" "$TMP/body"' "status=$c"
c=$(code "$GC/blog"); check "blog index lists DB posts (not the empty build-time snapshot)" '[[ $c == 200 ]] && grep -q "google-business-profile-clinic-growth" "$TMP/body"'
c=$(code "$GC/api/health"); check "/api/health ok (container health + scheduled publishing)" '[[ $c == 200 && "$(json "$TMP/body" "j.ok")" == true ]]'
hdrs="$(curl -s -D - -o "$TMP/null" "$GC/")"
check "security headers from proxy (nosniff, XFO)" 'grep -qi "x-content-type-options: nosniff" <<<"$hdrs" && grep -qi "x-frame-options: SAMEORIGIN" <<<"$hdrs"'
check "no X-Powered-By leak" '! grep -qi "^x-powered-by" <<<"$hdrs"'
check "IndexNow disabled outside production" '[[ "$(docker compose exec -T growclinic printenv INDEXNOW_ENABLED | tr -d "\r")" == false ]]'

# Admin-managed tracking comes from the DB at render time (never baked in at build).
# safeGtmId() only renders ids matching /^GTM-[A-Z0-9]{4,12}$/i, so keep the
# per-run id inside that format (bare "GTM-SMOKE$RUN" is 15 chars and is dropped).
gtm_id="GTM-SMK${RUN: -5}"
prev_gtm="$(psql_admin "SELECT coalesce(\"gtmId\", '') FROM growclinic.\"SiteSettings\" WHERE id = 'global'")"
psql_admin "INSERT INTO growclinic.\"SiteSettings\" (id, \"gtmId\", \"updatedAt\") VALUES ('global', '$gtm_id', now()) ON CONFLICT (id) DO UPDATE SET \"gtmId\" = excluded.\"gtmId\"" >/dev/null
c=$(code "$GC/blog/category/smoke-$RUN"); check "layout renders GTM container id from SiteSettings" '[[ $c == 200 ]] && grep -q "$gtm_id" "$TMP/body"'
psql_admin "UPDATE growclinic.\"SiteSettings\" SET \"gtmId\" = 'GTM-X'');alert(1337)//' WHERE id = 'global'" >/dev/null
c=$(code "$GC/blog/category/smoke-inj-$RUN"); check "malformed tracking id is never injected into inline scripts" '[[ $c == 200 ]] && ! grep -q "alert(1337)" "$TMP/body"'
psql_admin "UPDATE growclinic.\"SiteSettings\" SET \"gtmId\" = nullif('$prev_gtm', '') WHERE id = 'global'" >/dev/null

loc=$(curl -s -o "$TMP/null" -w '%{redirect_url}' "$GC/admin/dashboard")
check "unauthenticated /admin → /admin/login on public origin" '[[ "$loc" == "$GC/admin/login" ]]' "$loc"
csrf=$(curl -s -c "$J" -b "$J" "$GC/api/auth/csrf" | node -pe 'JSON.parse(require("fs").readFileSync(0)).csrfToken')
loc=$(curl -s -o "$TMP/null" -c "$J" -b "$J" -w '%{redirect_url}' -X POST "$GC/api/auth/callback/credentials" \
  --data-urlencode "email=$(envv GROWCLINIC_SEED_ADMIN_EMAIL | tr '[:lower:]' '[:upper:]')" \
  --data-urlencode "password=$(envv GROWCLINIC_SEED_ADMIN_PASSWORD)" --data-urlencode "csrfToken=$csrf" \
  --data-urlencode "callbackUrl=$GC/admin/dashboard")
check "admin login (upper-cased email → citext match)" '[[ "$loc" == "$GC/admin/dashboard" ]]' "$loc"
c=$(code -b "$J" "$GC/api/auth/session"); check "session carries the admin role" '[[ "$(json "$TMP/body" "j.user.role")" == admin ]]' "$(cat "$TMP/body")"
for p in /admin/dashboard /admin/posts /admin/casestudies /admin/clients /admin/testimonials /admin/inquiries /admin/audits /admin/users /admin/settings /admin/profile; do
  c=$(code -b "$J" "$GC$p"); check "admin page $p → 200" '[[ $c == 200 ]]'
done

c=$(code -X POST "$GC/api/contact" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Rao $RUN\",\"email\":\"rao$RUN@example.com\",\"source\":\"smoke\",\"message\":\"नमस्ते 🙏 smoke $RUN\"}")
check "POST /api/contact writes ContactMessage (201)" '[[ $c == 201 ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$GC/api/bookings" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Iyer\",\"email\":\"iyer$RUN@example.com\",\"phone\":\"+91 98100 0000\",\"clinicName\":\"Smoke Eye $RUN\",\"clinicType\":\"ENT\",\"challenge\":\"smoke\"}")
check "POST /api/bookings writes ConsultationBooking (201)" '[[ $c == 201 ]]' "$(cat "$TMP/body")"
crm=""; for i in $(seq 1 20); do
  crm="$(psql_admin "SELECT string_agg(source, ',' ORDER BY source) FROM audit.popup_leads WHERE email IN ('rao$RUN@example.com', 'iyer$RUN@example.com')")"
  [[ "$crm" == "growclinic-booking,growclinic-contact" ]] && break; sleep 0.5
done
check "contact + booking leads reach the audit CRM over the private network" '[[ "$crm" == "growclinic-booking,growclinic-contact" ]]' "$crm"
c=$(code -X POST "$GC/api/leads" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Lead\",\"email\":\"lead$RUN@example.com\"}")
check "POST /api/leads writes Lead (201)" '[[ $c == 201 ]]'
c=$(code -X POST "$GC/api/audit" -H 'Content-Type: application/json' -d "{\"fullName\":\"Dr Smoke\",\"clinicName\":\"Smoke Derma $RUN\",\"specialization\":\"Dermatologist\",\"city\":\"Pune\",\"phone\":\"\",\"pinCode\":\"411001\"}")
check "POST /api/audit scores + stores ClinicAudit" '[[ $c == 200 && -n "$(json "$TMP/body" "j.auditId")" ]]' "$(cat "$TMP/body")"

c=$(code -X POST "$GC/api/audit-intake" -H 'Content-Type: application/json' -d "{\"fullName\":\"Dr Handoff\",\"clinicName\":\"Handoff Clinic $RUN\",\"specialization\":\"Dentist\",\"city\":\"Kochi\",\"phone\":\"+91 98100 12345\",\"channels\":[\"google\"],\"utmSource\":\"smoke\"}")
htok="$(json "$TMP/body" "j.handoffToken")"; hurl="$(json "$TMP/body" "j.handoffUrl")"
check "audit-intake → audit tool /api/intake returns a one-time handoff" '[[ $c == 200 && -n "$htok" && "$hurl" == "$(envv AUDIT_PUBLIC_URL)/?t=$htok" ]]' "$(cat "$TMP/body")"
wh="$(psql_admin "SELECT \"webhookStatus\" || ':' || coalesce(\"webhookCode\"::text, '') FROM growclinic.\"ClinicAudit\" WHERE \"clinicName\" = 'Handoff Clinic $RUN'")"
check "ClinicAudit records webhook delivery (success:200)" '[[ "$wh" == "success:200" ]]' "$wh"
al="$(psql_admin "SELECT count(*) FROM audit.leads WHERE \"clinicName\" = 'Handoff Clinic $RUN' AND \"primaryGoal\" = 'growclinic-site'")"
check "lead stored in the audit schema by the intake" '[[ "$al" == 1 ]]' "$al"
c=$(code "$AU/api/handoff/$htok"); check "handoff token exchanges for the prefill" '[[ "$(json "$TMP/body" "j.found")" == true && "$(json "$TMP/body" "j.clinic")" == "Handoff Clinic $RUN" ]]' "$(cat "$TMP/body")"
c=$(code "$AU/api/handoff/$htok"); check "handoff token is single-use" '[[ "$(json "$TMP/body" "j.found")" == false ]]'

c=$(code -b "$J" "$GC/api/inquiries?search=SMOKE%20RAO%20$RUN")
check "admin inquiry search is case-insensitive (mode: insensitive)" '[[ $c == 200 && "$(json "$TMP/body" "j.totalItems")" == 1 ]]' "$(cat "$TMP/body")"
c=$(code -b "$J" "$GC/api/audits/admin?search=smoke%20derma%20$RUN"); check "admin audits search" '[[ "$(json "$TMP/body" "j.totalItems")" == 1 ]]' "$(cat "$TMP/body")"
c=$(code -b "$J" "$GC/api/bookings/admin?search=SMOKE%20EYE%20$RUN"); check "admin bookings search" '[[ "$(json "$TMP/body" "j.length")" == 1 ]]'
c=$(code "$GC/api/inquiries"); check "admin API without session → 401" '[[ $c == 401 ]]'

c=$(code -b "$J" -X POST "$GC/api/posts" -H 'Content-Type: application/json' -d "{\"title\":\"Smoke $RUN\",\"slug\":\"smoke-$RUN\",\"content\":\"<p>x</p>\",\"published\":true,\"tags\":[\"Smoke Tag $RUN\"],\"metaDescription\":\"smoke\",\"noIndex\":true}")
check "create published post with new tag + SEO fields" '[[ $c == 201 ]]' "$(cat "$TMP/body")"
c=$(code -b "$J" -X POST "$GC/api/posts" -H 'Content-Type: application/json' -d "{\"title\":\"Smoke B $RUN\",\"slug\":\"smoke-b-$RUN\",\"content\":\"<p>y</p>\",\"tags\":[\"smoke tag $RUN\"]}")
postb="$(json "$TMP/body" "j.id")"
tagcount="$(psql_admin "SELECT count(*) FROM growclinic.\"Tag\" WHERE lower(name::text) = 'smoke tag $RUN'")"   # lower(): citext operators live in the growclinic schema
check "differently-cased tag reuses existing tag (citext, no unique violation)" '[[ $c == 201 && "$tagcount" == 1 ]]' "status=$c tags=$tagcount"
c=$(code -b "$J" -X POST "$GC/api/posts" -H 'Content-Type: application/json' -d "{\"title\":\"dup\",\"slug\":\"SMOKE-$RUN\",\"content\":\"<p>z</p>\"}")
check "slug uniqueness is case-insensitive (400 'Slug must be unique')" '[[ $c == 400 ]]' "$(cat "$TMP/body")"
c=$(code "$GC/api/posts"); check "anonymous GET /api/posts (lists drafts) → 401" '[[ $c == 401 ]]'
c=$(code "$GC/api/posts/$postb"); check "anonymous GET /api/posts/<id> (draft + author email) → 401" '[[ -n "$postb" && $c == 401 ]]'

# Viewer accounts are read-only.
vpass="Viewer-$RUN-pass"
vhash="$(docker compose exec -T growclinic node -e 'require("bcryptjs").hash(process.argv[1],10).then(h=>process.stdout.write(h))' "$vpass")"
psql_admin "INSERT INTO growclinic.\"User\" (id, name, email, password, role, \"updatedAt\") VALUES ('smoke-viewer-$RUN', 'Smoke Viewer', 'viewer$RUN@example.com', '$vhash', 'viewer', now())" >/dev/null
VJ="$TMP/viewer.jar"
vcsrf=$(curl -s -c "$VJ" -b "$VJ" "$GC/api/auth/csrf" | node -pe 'JSON.parse(require("fs").readFileSync(0)).csrfToken')
curl -s -o "$TMP/null" -c "$VJ" -b "$VJ" -X POST "$GC/api/auth/callback/credentials" \
  --data-urlencode "email=viewer$RUN@example.com" --data-urlencode "password=$vpass" \
  --data-urlencode "csrfToken=$vcsrf" --data-urlencode "callbackUrl=$GC/admin/dashboard"
c=$(code -b "$VJ" "$GC/api/posts"); check "viewer can read the admin post list" '[[ $c == 200 ]]'
c=$(code -b "$VJ" -X POST "$GC/api/posts" -H 'Content-Type: application/json' -d "{\"title\":\"v\",\"slug\":\"viewer-$RUN\",\"content\":\"<p>v</p>\"}")
check "viewer cannot create posts (403)" '[[ $c == 403 ]]' "$(cat "$TMP/body")"
c=$(code -b "$VJ" -X DELETE "$GC/api/posts/$postb"); check "viewer cannot delete posts (403)" '[[ $c == 403 ]]'
c=$(code -b "$VJ" -F "file=@$(hostpath "$0");type=image/png;filename=v.png" "$GC/api/upload"); check "viewer cannot upload (403)" '[[ $c == 403 ]]'
psql_admin "DELETE FROM growclinic.\"User\" WHERE id = 'smoke-viewer-$RUN'" >/dev/null
c=$(code "$GC/blog/smoke-$RUN"); check "published post page renders (noIndex honoured)" '[[ $c == 200 ]] && grep -q "noindex" "$TMP/body"'
c=$(code -b "$J" -X POST "$GC/api/posts" -H 'Content-Type: application/json' -d "{\"title\":\"Smoke Sched $RUN\",\"slug\":\"smoke-sched-$RUN\",\"content\":\"<p>s</p>\",\"published\":false,\"scheduledFor\":\"2020-01-01T00:00:00Z\"}")
curl -s -o "$TMP/null" "$GC/api/health"
sched="$(psql_admin "SELECT published::text || ':' || (\"publishedAt\" IS NOT NULL)::text FROM growclinic.\"Post\" WHERE slug = 'smoke-sched-$RUN'")"
check "due scheduled post is published by /api/health" '[[ $c == 201 && "$sched" == "true:true" ]]' "status=$c state=$sched"

# Server actions are POST endpoints on the pages that use them. proxy.ts only
# checks that a session cookie is PRESENT, so a forged cookie reaches the action:
# the action itself must verify the session.
del_action="$(docker compose exec -T growclinic node -e 'const m=require("/app/.next/server/server-reference-manifest.json").node;process.stdout.write(Object.keys(m).find(k=>m[k].exportedName==="deletePost"&&/admin\/actions/.test(m[k].filename))||"")')"
c=$(code -X POST "$GC/admin/posts" -H "Cookie: authjs.session-token=forged" -H "Next-Action: $del_action" -H 'Content-Type: text/plain;charset=UTF-8' --data "[\"$postb\"]")
still="$(psql_admin "SELECT count(*) FROM growclinic.\"Post\" WHERE id = '$postb'")"
check "deletePost server action with a forged session cookie is refused (post kept)" '[[ -n "$del_action" && -n "$postb" && $c == 500 && "$still" == 1 ]]' "action=$del_action post=$postb status=$c count=$still"
c=$(code -b "$J" -X POST "$GC/admin/posts" -H "Next-Action: $del_action" -H 'Content-Type: text/plain;charset=UTF-8' --data "[\"$postb\"]")
gone="$(psql_admin "SELECT count(*) FROM growclinic.\"Post\" WHERE id = '$postb'")"
check "signed-in deletePost server action works (same request, real session)" '[[ $c == 200 && "$gone" == 0 ]]' "status=$c count=$gone"

c=$(code -X POST "$GC/api/clientlogos" -H 'Content-Type: application/json' -d "{\"name\":\"Anon $RUN\"}"); check "client logo create without session → 401" '[[ $c == 401 ]]'
c=$(code -b "$J" -X POST "$GC/api/clientlogos" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Logo $RUN\",\"order\":99}"); logo="$(json "$TMP/body" "j.id")"
check "client logo create with session → 201" '[[ $c == 201 && -n "$logo" ]]' "$(cat "$TMP/body")"
c=$(code -X PATCH "$GC/api/clientlogos/$logo" -H 'Content-Type: application/json' -d '{"name":"pwned"}'); check "client logo update without session → 401" '[[ $c == 401 ]]'
c=$(code -X DELETE "$GC/api/clientlogos/$logo"); check "client logo delete without session → 401" '[[ $c == 401 ]]'
c=$(code -b "$J" -X DELETE "$GC/api/clientlogos/$logo"); check "client logo delete with session → 200" '[[ $c == 200 ]]'
c=$(code -b "$J" -X POST "$GC/api/casestudies" -H 'Content-Type: application/json' -d "{\"title\":\"Smoke CS $RUN\",\"slug\":\"smoke-cs-$RUN\",\"clientName\":\"Smoke Clinic\",\"services\":\"seo,google-ads\",\"challenge\":\"c\",\"solution\":\"s\",\"results\":\"r\",\"metrics\":\"3x | Bookings\",\"published\":true}")
check "admin creates case study" '[[ $c == 200 && -n "$(json "$TMP/body" "j.id")" ]]' "$(cat "$TMP/body")"
c=$(code -b "$J" -X POST "$GC/api/casestudies" -H 'Content-Type: application/json' -d "{\"title\":\"Draft CS $RUN\",\"slug\":\"smoke-cs-draft-$RUN\",\"clientName\":\"Draft Clinic\",\"challenge\":\"c\",\"solution\":\"s\",\"results\":\"r\",\"published\":false}")
csd="$(json "$TMP/body" "j.id")"
c=$(code "$GC/api/casestudies"); check "anonymous case study list hides unpublished" '[[ $c == 200 && -n "$csd" ]] && ! grep -q "smoke-cs-draft-$RUN" "$TMP/body"'
c=$(code "$GC/api/casestudies/$csd"); check "anonymous unpublished case study → 404" '[[ $c == 404 ]]'
c=$(code -b "$J" "$GC/api/casestudies/$csd"); check "signed-in editor still sees the draft case study" '[[ $c == 200 ]]'
c=$(code "$GC/case-studies/smoke-cs-$RUN"); check "case study page renders" '[[ $c == 200 ]] && grep -q "Smoke CS $RUN" "$TMP/body"'

printf '\x89PNG\r\n\x1a\n%s' "smoke" > "$TMP/pixel.png"
c=$(code -b "$J" -F "file=@$(hostpath "$TMP/pixel.png");type=image/png" "$GC/api/upload"); up="$(json "$TMP/body" "j.url")"
check "admin image upload → volume" '[[ $c == 200 && "$up" == /api/uploads/*.png ]]' "$(cat "$TMP/body")"
c=$(code "$GC$up"); check "uploaded file served back" '[[ -n "$up" && $c == 200 ]]'
check "upload persisted in growclinic_uploads volume" '[[ -n "$up" ]] && docker compose exec -T growclinic ls /data/uploads | grep -q "${up##*/}"'
c=$(code -b "$J" -F "file=@$(hostpath "$TMP/pixel.png");filename=x./../../../app/evil;type=image/png" "$GC/api/upload")
check "crafted upload filename / non-image extension rejected (415, nothing written)" '[[ $c == 415 ]] && ! docker compose exec -T growclinic test -e /app/evil' "$(cat "$TMP/body")"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > "$TMP/x.svg"
c=$(code -b "$J" -F "file=@$(hostpath "$TMP/x.svg");type=image/svg+xml" "$GC/api/upload"); svg="$(json "$TMP/body" "j.url")"
svgh="$(curl -s -D - -o "$TMP/null" "$GC$svg")"
check "uploaded SVG is served sandboxed (CSP sandbox + nosniff)" '[[ -n "$svg" ]] && grep -qi "^content-security-policy:.*sandbox" <<<"$svgh" && grep -qi "^x-content-type-options: nosniff" <<<"$svgh"' "$svgh"
trav=""; for t in "..%2F..%2F..%2Fetc%2Fpasswd" "%2E%2E%2F%2E%2E%2F%2E%2E%2Fetc%2Fpasswd" "%2E%2E%2F%2E%2E%2Fproc%2Fself%2Fenviron"; do
  c=$(code --path-as-is "$GC/api/uploads/$t"); trav+="$c "; grep -qE "root:|PATH=|DATABASE_URL" "$TMP/body" && trav+="LEAK "
done
check "path traversal on /api/uploads blocked (no /etc/passwd or env leak)" '[[ "$trav" != *200* && "$trav" != *LEAK* ]]' "$trav"
c=$(code -b "$J" "$GC/api/uploads"); check "upload library lists files" '[[ $c == 200 ]]'

payload="{\"triggerEvent\":\"BOOKING_CREATED\",\"payload\":{\"startTime\":\"2030-01-01T10:00:00Z\",\"attendees\":[{\"name\":\"Cal Smoke\",\"email\":\"cal$RUN@example.com\"}],\"responses\":{}}}"
sig=$(node -e 'process.stdout.write(require("crypto").createHmac("sha256",process.argv[1]).update(process.argv[2]).digest("hex"))' "$(envv GROWCLINIC_CAL_WEBHOOK_SECRET)" "$payload")
c=$(code -X POST "$GC/api/webhooks/cal" -H "x-cal-signature-256: $sig" -H 'Content-Type: application/json' --data-binary "$payload")
check "Cal.com webhook with valid HMAC → booking stored" '[[ $c == 201 ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$GC/api/webhooks/cal" -H "x-cal-signature-256: deadbeef" -H 'Content-Type: application/json' --data-binary "$payload")
check "Cal.com webhook with bad signature → 401" '[[ $c == 401 ]]'

codes=""; for i in $(seq 1 25); do codes+="$(curl -s -o "$TMP/null" -w '%{http_code} ' -X POST "$GC/api/auth/callback/credentials" -d 'email=x@y.z&password=bad')"; done
check "Nginx rate-limits NextAuth credential POSTs (429 seen)" 'grep -q 429 <<<"$codes"' "$codes"
codes=""; for i in $(seq 1 25); do codes+="$(curl -s -o "$TMP/null" -w '%{http_code} ' -X POST "$GC/admin/login" -H 'Next-Action: 0' -d 'x=1')"; done
check "Nginx rate-limits server-action login POSTs to /admin/login (429 seen)" 'grep -q 429 <<<"$codes"' "$codes"
c=$(code "$GC/admin/login"); check "login page GETs are not throttled" '[[ $c == 200 ]]'

# ─────────────────────────────────────────────────────────────────────────────
echo "▶ audit.growclinic.io"
A="$TMP/au.jar"
c=$(code "$AU/"); check "homepage 200" '[[ $c == 200 ]]'
c=$(code "$AU/api/health"); check "/api/health ok" '[[ "$(json "$TMP/body" "j.status")" == ok ]]'
ah="$(curl -s -D - -o "$TMP/null" "$AU/")"
check "app CSP present and not duplicated by proxy" '[[ $(grep -ci "^x-frame-options" <<<"$ah") == 1 ]] && grep -qi "content-security-policy" <<<"$ah"'
c=$(code "$AU/admin"); check "admin UI 200" '[[ $c == 200 ]]'
c=$(code -D "$TMP/auh" -X POST "$AU/admin/login" -H 'Content-Type: application/json' -d "{\"username\":\"ADMIN\",\"password\":\"$(envv AUDIT_ADMIN_INITIAL_PASSWORD)\"}")
tok="$(setcookie gc_admin "$TMP/auh")"
ck="$(grep -i "^set-cookie: gc_admin=" "$TMP/auh")"
check "admin login (case-insensitive username)" '[[ $c == 200 && -n "$tok" ]]' "$(cat "$TMP/body")"
check "admin cookie is HttpOnly + SameSite=Strict + Secure (NODE_ENV=production)" 'grep -qi HttpOnly <<<"$ck" && grep -qi "SameSite=Strict" <<<"$ck" && grep -qi Secure <<<"$ck"' "$ck"
for p in /admin/me /admin/stats /admin/overview /admin/chats /admin/team /admin/users /admin/logs /admin/usage /admin/popup-leads /admin/tasks /admin/automations /admin/reports/sources /admin/integrations/health /admin/integrations/queue /admin/notifications/prefs /admin/workspace /admin/marketing; do
  c=$(code -H "Cookie: gc_admin=$tok" "$AU$p"); check "GET $p → 200" '[[ $c == 200 ]]' "$(cat "$TMP/body")"
done
c=$(code "$AU/admin/stats"); check "admin API without session → 401" '[[ $c == 401 ]]'
sid="smoke${RUN}"
c=$(code -X POST "$AU/api/visit" -H 'Content-Type: application/json' -d "{\"sessionId\":\"$sid\",\"source\":\"smoke\",\"channel\":\"direct\",\"landingPage\":\"/?utm_source=smoke\"}")
check "visit tracking (chat_sessions upsert)" '[[ $c == 200 ]]'
c=$(code -X POST "$AU/api/lead-magnet" -H 'Content-Type: application/json' -d "{\"name\":\"Popup $RUN\",\"phone\":\"98765$RUN\",\"source\":\"smoke\",\"sessionId\":\"$sid\"}")
check "lead capture (popup_leads)" '[[ $c == 200 ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$AU/admin/prospects" -H "Cookie: gc_admin=$tok" -H 'Content-Type: application/json' -d "{\"name\":\"Dr Prospect $RUN\",\"clinic\":\"Prospect Clinic $RUN\",\"phone\":\"+91 9$(printf '%09d' $((RUN % 1000000000)))\",\"city\":\"Pune\",\"source\":\"manual\",\"status\":\"new\"}")
psid="$(json "$TMP/body" "j.sessionId")"
check "CRM: create prospect" '[[ $c == 200 && -n "$psid" ]]' "$(cat "$TMP/body")"
sleep 2
c=$(code -X PATCH "$AU/admin/chats/$psid" -H "Cookie: gc_admin=$tok" -H 'Content-Type: application/json' -d '{"status":"meeting_scheduled","rating":"hot","dealValue":25000,"remark":"smoke remark"}')
check "CRM: update lead (status/rating/deal/remark)" '[[ $c == 200 ]]' "$(cat "$TMP/body")"
c=$(code -H "X-API-Key: $(envv AUDIT_CRM_API_KEY)" "$AU/api/crm/leads?search=prospect%20clinic%20$RUN")
check "CRM API (X-API-Key) lists the lead with 0/1-era fields intact" '[[ $c == 200 && "$(json "$TMP/body" "j.leads[0].crmStatus")" == meeting_scheduled ]]' "$(cat "$TMP/body")"
c=$(code -H "X-API-Key: wrong-key-wrong-key" "$AU/api/crm/leads"); check "CRM API wrong key → 401" '[[ $c == 401 ]]'
c=$(code -X POST "$AU/api/intake" -H "x-growclinic-signature: $(envv AUDIT_INTAKE_SECRET)" -H 'Content-Type: application/json' -d "{\"lead\":{\"fullName\":\"Dr Intake\",\"clinicName\":\"Intake $RUN\",\"city\":\"Delhi\",\"phone\":\"9811111111\"}}")
ht="$(json "$TMP/body" "j.handoffToken")"
check "site → audit intake (INTAKE_SECRET) mints handoff token" '[[ $c == 200 && -n "$ht" ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$AU/api/intake" -H "x-growclinic-signature: wrong" -H 'Content-Type: application/json' -d '{}'); check "intake with wrong secret → 401" '[[ $c == 401 ]]'
check "handoff token stored in Redis under audit:* (ACL user)" '[[ "$(docker compose exec -T redis redis-cli --user audit --pass "$(envv REDIS_AUDIT_PASSWORD)" --no-auth-warning EXISTS "audit:handoff:$ht")" == 1 ]]'
docker compose restart audit >/dev/null 2>&1
for i in $(seq 1 40); do [[ "$(docker inspect -f '{{.State.Health.Status}}' growclinic-audit-1)" == healthy ]] && break; sleep 2; done
c=$(code "$AU/api/handoff/$ht"); check "handoff token survives app restart (Redis) and prefills" '[[ "$(json "$TMP/body" "j.found")" == true && "$(json "$TMP/body" "j.clinic")" == "Intake $RUN" ]]' "$(cat "$TMP/body")"
c=$(code "$AU/api/handoff/$ht"); check "handoff token is single-use" '[[ "$(json "$TMP/body" "j.found")" == false ]]'
check "Redis ACL: audit user cannot read gmb:* keys" '[[ "$(docker compose exec -T redis redis-cli --user audit --pass "$(envv REDIS_AUDIT_PASSWORD)" --no-auth-warning GET gmb:x 2>&1)" == *NOPERM* ]]'
check "Redis ACL: audit user cannot FLUSHALL" '[[ "$(docker compose exec -T redis redis-cli --user audit --pass "$(envv REDIS_AUDIT_PASSWORD)" --no-auth-warning FLUSHALL 2>&1)" == *NOPERM* ]]'
check "reports dir on persistent volume and writable by app user" 'docker compose exec -T audit sh -c "touch /data/reports/.smoke && rm /data/reports/.smoke"'
codes=""; for i in $(seq 1 12); do codes+="$(curl -s -o "$TMP/null" -w '%{http_code} ' -X POST "$AU/api/lead-magnet" -H 'Content-Type: application/json' -H "X-Forwarded-For: 198.51.100.$((RUN % 200)), 203.0.113.$((RUN % 200))" -d '{"phone":"9000000000","source":"smoke"}')"; done
check "per-client rate limit works through both proxies (real client IP, 429 seen)" 'grep -q 429 <<<"$codes"' "$codes"
c=$(code -X POST "$AU/api/lead-magnet" -H 'Content-Type: application/json' -H "X-Forwarded-For: 203.0.113.$(( (RUN % 200) + 1 ))" -d '{"phone":"9000000001","source":"smoke"}')
check "a different client IP is not affected by that limit" '[[ $c == 200 ]]' "$c $(cat "$TMP/body")"

# ─────────────────────────────────────────────────────────────────────────────
echo "▶ gmb.growclinic.io"
G="$TMP/gm.jar"
c=$(code "$GM/"); check "SPA index 200" '[[ $c == 200 ]] && grep -q "<div id=\"root\"" "$TMP/body"'
c=$(code "$GM/app"); check "client-side route falls back to index" '[[ $c == 200 ]]'
c=$(code "$GM/assets/does-not-exist.js"); check "missing asset → 404 (not HTML)" '[[ $c == 404 ]]'
c=$(code "$GM/api/nope"); check "unknown API → JSON 404" '[[ $c == 404 ]]'
phone="+9198$(printf '%08d' $((RUN % 100000000)))"
c=$(code -X POST "$GM/api/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\"}")
otp="$(json "$TMP/body" "j.testCode")"
check "OTP request (COUNT window query, test mode)" '[[ $c == 200 && -n "$otp" ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$GM/api/auth/otp/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\",\"code\":\"000000\"}")
check "wrong OTP rejected" '[[ $c == 400 ]]'
c=$(code -D "$TMP/gmh" -X POST "$GM/api/auth/otp/verify" -H 'Content-Type: application/json' -H "X-Forwarded-For: 198.51.100.7, 203.0.113.77" -d "{\"phone\":\"$phone\",\"code\":\"$otp\"}")
gs="$(setcookie gmb_session "$TMP/gmh")"; G="Cookie: gmb_session=$gs"
gck="$(grep -i "^set-cookie: gmb_session=" "$TMP/gmh")"
check "OTP verify → HttpOnly session cookie (user created)" '[[ $c == 200 && -n "$gs" && "$(json "$TMP/body" "j.firstLogin")" == true ]] && grep -qi httponly <<<"$gck"' "$(cat "$TMP/body")"
sessip="$(psql_admin "SELECT s.ip FROM gmb.sessions s JOIN gmb.users u ON u.id = s.\"userId\" WHERE u.phone = '$phone' LIMIT 1")"
check "real client IP recorded behind both proxies (spoofed hop ignored)" '[[ "$sessip" == 203.0.113.77 ]]' "$sessip"
c=$(code -H "$G" "$GM/api/auth/me"); check "/api/auth/me" '[[ $c == 200 && "$(json "$TMP/body" "j.user.phone")" == "$phone" ]]'
c=$(code -H "$G" -X POST "$GM/api/orgs" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Org $RUN\"}")
org="$(json "$TMP/body" "j.org.id")"; check "create organization + clinic_admin membership" '[[ $c == 200 && -n "$org" ]]'
c=$(code -H "$G" -X POST "$GM/api/locations" -H 'Content-Type: application/json' -d '{"name":"Smoke Clinic","city":"Pune","phone":"+91 20 0000 0000"}')
loc="$(json "$TMP/body" "j.location.id")"; created="$(json "$TMP/body" "j.location.updatedAt")"
check "create location (org-scoped)" '[[ $c == 200 && -n "$loc" ]]' "$(cat "$TMP/body")"
sleep 1
c=$(code -H "$G" -X PATCH "$GM/api/locations/$loc" -H 'Content-Type: application/json' -d '{"website":"https://smoke.example"}')
check "update location → updatedAt maintained by trigger" '[[ $c == 200 && "$(json "$TMP/body" "j.location.updatedAt")" != "$created" ]]' "$(cat "$TMP/body")"
c=$(code -H "$G" "$GM/api/locations"); check "list locations" '[[ "$(json "$TMP/body" "j.locations.length")" == 1 ]]'
c=$(code -H "$G" "$GM/api/locations/$loc/score"); check "profile score report" '[[ $c == 200 && -n "$(json "$TMP/body" "j.report")" ]]' "$(cat "$TMP/body")"
c=$(code -H "$G" "$GM/api/locations/not-a-uuid"); check "malformed id → 404 (varchar ids, not a uuid cast error)" '[[ $c == 404 ]]'
c=$(code -H "$G" "$GM/api/orgs/$org/members"); check "org members (clinic_admin)" '[[ $c == 200 ]]'
c=$(code "$GM/api/locations"); check "no session → 401" '[[ $c == 401 ]]'
phone2="+9197$(printf '%08d' $((RUN % 100000000)))"
otp2=$(curl -s -X POST "$GM/api/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone2\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).testCode')
curl -s -o "$TMP/null" -D "$TMP/gmh2" -X POST "$GM/api/auth/otp/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone2\",\"code\":\"$otp2\"}"
H2="Cookie: gmb_session=$(setcookie gmb_session "$TMP/gmh2")"
curl -s -o "$TMP/null" -H "$H2" -X POST "$GM/api/orgs" -H 'Content-Type: application/json' -d '{"name":"Other Org"}'
c=$(code -H "$H2" "$GM/api/locations/$loc"); check "tenant isolation: other org cannot read the location" '[[ -n "$loc" && $c == 404 ]]'
c=$(code -H "$H2" "$GM/api/orgs/$org"); check "tenant isolation: non-member cannot read the org" '[[ -n "$org" && $c == 403 ]]'
c=$(code -H "$H2" -X PATCH "$GM/api/locations/$loc" -H 'Content-Type: application/json' -d '{"name":"hijack"}'); check "tenant isolation: other org cannot modify the location" '[[ -n "$loc" && $c == 404 ]]'
gl="$(curl -s -H "$G" -o "$TMP/null" -w '%{redirect_url}' "$GM/api/google/connect")"
check "Google connect redirects to accounts.google.com with state" '[[ "$gl" == https://accounts.google.com/* && "$gl" == *state=* ]]' "$gl"
forged=$(node -e 'process.stdout.write(Buffer.from(JSON.stringify({orgId:process.argv[1],userId:"x",nonce:"forged"})).toString("base64"))' "$org")
c=$(code -H "$G" "$GM/api/google/callback?code=abc&state=$forged"); check "OAuth callback with forged state rejected (CSRF nonce)" '[[ $c == 400 ]]'
body="{\"clinic\":\"Handoff $RUN\",\"phone\":\"9811111111\"}"
hsig=$(node -e 'process.stdout.write(require("crypto").createHmac("sha256",process.argv[1]).update(process.argv[2]).digest("hex"))' "$(envv GMB_INBOUND_HANDOFF_KEY)" "$(node -e 'process.stdout.write(JSON.stringify(JSON.parse(process.argv[1])))' "$body")")
c=$(code -X POST "$GM/api/handoff" -H "x-handoff-key: $hsig" -H 'Content-Type: application/json' -d "$body"); htok="$(json "$TMP/body" "j.token")"
check "audit → gmb handoff (HMAC) mints token" '[[ $c == 200 && -n "$htok" ]]' "$(cat "$TMP/body")"
c=$(code "$GM/api/handoff/$htok"); check "handoff token redeemed from Redis" '[[ $c == 200 && "$(json "$TMP/body" "j.clinic")" == "Handoff $RUN" ]]'
c=$(code "$GM/api/handoff/$htok"); check "handoff token single-use" '[[ $c == 404 ]]'
c=$(code -X POST "$GM/api/handoff" -H "x-handoff-key: 00" -H 'Content-Type: application/json' -d "$body"); check "handoff bad signature → 403" '[[ $c == 403 ]]'
# Depends on local config: with GMB_GOOGLE_PLACES_API_KEY set the endpoint really
# calls Google (200); with it empty the app must report configured-off, not crash.
c=$(code "$GM/api/audit/search?q=dental")
if [[ -n "$(envv GMB_GOOGLE_PLACES_API_KEY)" ]]; then
  check "public audit with Places key → 200 results" '[[ $c == 200 ]] && [[ -n "$(json "$TMP/body" "j.results.length")" ]]' "$c"
else
  check "public audit without Places key → 503 (configured-off, no crash)" '[[ $c == 503 ]]' "$c"
fi
for i in 1 2 3 4; do curl -s -o "$TMP/null" -X POST "$GM/api/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\"}"; done
c=$(code -X POST "$GM/api/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\"}")
check "OTP per-phone hourly cap enforced (6th request → 429)" '[[ $c == 429 ]]' "$c"

# ─────────────────────────────────────────────────────────────────────────────
echo "▶ engine.growclinic.io"
c=$(code "$EN/"); check "homepage 200 (noindex)" '[[ $c == 200 ]] && grep -qi "noindex" "$TMP/body"'
c=$(code "$EN/api/health"); check "/api/health db up" '[[ "$(json "$TMP/body" "j.db")" == up ]]'
eh="$(curl -s -D - -o "$TMP/null" "$EN/embed.js")"
check "embed.js served cross-origin" 'grep -qi "access-control-allow-origin: \*" <<<"$eh"'
# QA tenants created directly (the engine has no clinic admin UI yet).
keyA="qaa_live_$(node -e 'process.stdout.write(require("crypto").randomBytes(18).toString("base64url"))')"
keyB="qab_live_$(node -e 'process.stdout.write(require("crypto").randomBytes(18).toString("base64url"))')"
sha() { node -e 'process.stdout.write(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' "$1"; }
psql_admin "INSERT INTO engine.\"Clinic\" (id, name, slug, plan, \"updatedAt\") VALUES ('qa_a_$RUN','QA Clinic A','qa-a-$RUN','PRO',now()), ('qa_b_$RUN','QA Clinic B','qa-b-$RUN','FREE',now());
            INSERT INTO engine.\"ActivationKey\" (id, \"clinicId\", \"keyHash\", label, \"allowedOrigins\") VALUES
              ('qa_ka_$RUN','qa_a_$RUN','$(sha "$keyA")','qaa','clinic-a.example'), ('qa_kb_$RUN','qa_b_$RUN','$(sha "$keyB")','qab','clinic-b.example');" >/dev/null
c=$(code -X OPTIONS "$EN/api/ingest/lead" -H 'Origin: https://clinic-a.example' -H 'Access-Control-Request-Method: POST'); check "CORS preflight 204" '[[ $c == 204 ]]'
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://www.clinic-a.example' -H 'Content-Type: application/json' -d "{\"key\":\"$keyA\",\"name\":\"Patient A\",\"phone\":\"+33 6 00\",\"meta\":{\"utm_source\":\"smoke\"}}")
check "lead ingest with valid key + allowed origin" '[[ $c == 200 ]]' "$(cat "$TMP/body")"
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-b.example' -H 'Content-Type: application/json' -d "{\"key\":\"$keyA\",\"name\":\"Stolen key\",\"phone\":\"1\"}")
check "leaked key used from another origin → 403" '[[ $c == 403 ]]'
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-a.example' -H 'Content-Type: application/json' -d '{"key":"bogus","name":"x","phone":"1"}')
check "invalid key → 401" '[[ $c == 401 ]]'
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-a.example' -H 'Content-Type: application/json' -d "{\"key\":\"$keyA\",\"name\":\"No contact\"}")
check "missing contact → 422" '[[ $c == 422 ]]'
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-b.example' -H "X-Engine-Key: $keyB" -H 'Content-Type: application/json' -d '{"name":"Patient B","email":"b@example.com"}')
check "second tenant ingest (header key)" '[[ $c == 200 ]]'
tenants="$(psql_admin "SELECT string_agg(\"clinicId\" || ':' || name, ',' ORDER BY name) FROM engine.\"Lead\" WHERE \"clinicId\" IN ('qa_a_$RUN','qa_b_$RUN')")"
check "tenant isolation: each lead stored under its own clinicId only" '[[ "$tenants" == "qa_a_$RUN:Patient A,qa_b_$RUN:Patient B" ]]' "$tenants"
lastused="$(psql_admin "SELECT \"lastUsedAt\" FROM engine.\"ActivationKey\" WHERE id = 'qa_ka_$RUN'")"
check "activation key lastUsedAt recorded" '[[ -n "$lastused" ]]'
psql_admin "INSERT INTO engine.\"Lead\" (id, \"clinicId\", name, phone) SELECT 'qa_fill_$RUN' || g, 'qa_b_$RUN', 'filler', '1' FROM generate_series(1, 49) g" >/dev/null
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-b.example' -H "X-Engine-Key: $keyB" -H 'Content-Type: application/json' -d '{"name":"Over cap","phone":"1"}')
check "FREE plan monthly lead cap → 402 upgrade" '[[ $c == 402 && "$(json "$TMP/body" "j.upgrade")" == true ]]' "$(cat "$TMP/body")"
psql_admin "UPDATE engine.\"Clinic\" SET status = 'SUSPENDED' WHERE id = 'qa_a_$RUN'" >/dev/null
c=$(code -X POST "$EN/api/ingest/lead" -H 'Origin: https://clinic-a.example' -H 'Content-Type: application/json' -d "{\"key\":\"$keyA\",\"name\":\"x\",\"phone\":\"1\"}")
check "suspended clinic → 403" '[[ $c == 403 ]]'

echo
echo "Passed: $PASS   Failed: $FAIL"
((FAIL)) && printf '  - %s\n' "${FAILED[@]}"
exit $((FAIL > 0))
