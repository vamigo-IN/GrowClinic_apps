#!/usr/bin/env bash
# Removes the rows scripts/smoke-test.sh and tests/audit-db.test.js leave behind
# in the LOCAL database, so repeated runs do not accumulate QA data.
#
#   ./scripts/smoke-clean.sh            # delete, printing per-table counts
#   ./scripts/smoke-clean.sh --dry-run  # only report what would go
#
# Matches the fixtures the smoke test creates ("Smoke …", "Handoff Clinic …",
# "Intake …", *@example.com, engine qa_* tenants, GMB smoke orgs). It never
# touches seeded content (blog posts from prisma/seed.ts) or the seeded admin.
# NEVER run against production.
set -uo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1

DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1

[[ -f .env ]] || { echo ".env missing"; exit 1; }
envv() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
# Same guard as smoke-test.sh: refuse unless this is the loopback-bound local stack.
if [[ "$(envv PROXY_HTTP_BIND)" != 127.0.0.1:* ]]; then
  echo "refusing: PROXY_HTTP_BIND is not a loopback address"; exit 1
fi
psql_admin() { docker compose exec -T postgres psql -U "$(envv POSTGRES_SUPERUSER)" -d "$(envv POSTGRES_DB)" -Atc "$1"; }

TOTAL=0; FAILED=0
# where <label> <table> <predicate>
where() {
  local label="$1" table="$2" pred="$3"
  local n; n="$(psql_admin "SELECT count(*) FROM $table WHERE $pred" 2>&1)"
  n="${n//[$'\r\n']/}"
  # A bad predicate must not pass as "nothing to clean".
  if [[ ! "$n" =~ ^[0-9]+$ ]]; then
    printf '  x  %-34s query failed: %s\n' "$label" "${n:0:80}"; FAILED=1; return
  fi
  if (( n == 0 )); then printf '  .  %-34s 0\n' "$label"; return; fi
  if (( DRY )); then
    printf '  ?  %-34s %s (would delete)\n' "$label" "$n"
  else
    psql_admin "DELETE FROM $table WHERE $pred" >/dev/null
    printf '  v  %-34s %s deleted\n' "$label" "$n"
  fi
  TOTAL=$((TOTAL + n))
}

(( DRY )) && echo "> dry run - nothing will be deleted"

echo "> growclinic"
where "Post (smoke slugs)"        'growclinic."Post"'                "slug LIKE '%smoke%'"
where "CaseStudy (smoke slugs)"   'growclinic."CaseStudy"'           "slug LIKE '%smoke%'"
where "Tag (smoke)"               'growclinic."Tag"'                 "name ILIKE '%smoke%'"
where "ClientLogo (Smoke Logo)"   'growclinic."ClientLogo"'          "name ILIKE 'Smoke Logo%'"
where "Media (smoke uploads)"     'growclinic."Media"'               "url ILIKE '%smoke%'"
where "ContactMessage (example)"  'growclinic."ContactMessage"'      "email LIKE '%@example.com'"
where "ConsultationBooking (ex.)" 'growclinic."ConsultationBooking"' "email LIKE '%@example.com'"
where "Lead (example.com)"        'growclinic."Lead"'                "email LIKE '%@example.com'"
where "ClinicAudit (smoke)"       'growclinic."ClinicAudit"'         "\"clinicName\" ILIKE 'Smoke %' OR \"clinicName\" ILIKE 'Handoff Clinic %' OR \"fullName\" ILIKE 'Dr Smoke%' OR \"fullName\" ILIKE 'Dr Handoff%'"
where "User (smoke viewers)"      'growclinic."User"'                "id LIKE 'smoke-viewer-%' OR email LIKE 'viewer%@example.com'"

echo "> audit"
where "popup_leads (example.com)" 'audit.popup_leads'                "email LIKE '%@example.com'"
where "leads (smoke clinics)"     'audit.leads'                      "\"clinicName\" ILIKE 'Smoke %' OR \"clinicName\" ILIKE 'Handoff Clinic %' OR \"clinicName\" ILIKE 'Intake %' OR \"clinicName\" ILIKE 'Prospect Clinic %'"
where "chat_sessions (smoke)"     'audit.chat_sessions'              "\"sessionId\" ILIKE '%smoke%' OR \"userName\" ILIKE 'Dr Prospect %' OR \"clinicName\" ILIKE 'Prospect Clinic %'"

echo "> gmb"
where "locations (smoke orgs)"    'gmb.locations'                    "\"orgId\" IN (SELECT id FROM gmb.organizations WHERE name ILIKE 'Smoke Org %' OR name = 'Other Org')"
where "memberships (smoke orgs)"  'gmb.memberships'                  "\"orgId\" IN (SELECT id FROM gmb.organizations WHERE name ILIKE 'Smoke Org %' OR name = 'Other Org')"
where "organizations (smoke)"     'gmb.organizations'                "name ILIKE 'Smoke Org %' OR name = 'Other Org'"
where "otp_codes (smoke phones)"  'gmb.otp_codes'                    "phone LIKE '+9198%'"
where "users (smoke phones)"      'gmb.users'                        "phone LIKE '+9198%'"

echo "> engine"
where "Lead (qa tenants)"         'engine."Lead"'                    "\"clinicId\" LIKE 'qa\_%'"
where "ActivationKey (qa)"        'engine."ActivationKey"'           "id LIKE 'qa\_%' OR \"clinicId\" LIKE 'qa\_%'"
where "Clinic (qa tenants)"       'engine."Clinic"'                  "id LIKE 'qa\_%'"

echo
if (( DRY )); then echo "Would delete: $TOTAL rows"; else echo "Deleted: $TOTAL rows"; fi
if (( FAILED )); then echo "one or more predicates failed - see 'x' rows above"; exit 1; fi
exit 0
