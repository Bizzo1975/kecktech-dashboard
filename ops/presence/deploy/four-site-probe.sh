#!/bin/bash
set -euo pipefail
cd /opt/me-manager

load_env() {
  local f="$1"
  [ -f "$f" ] || return 0
  while IFS= read -r line; do
    case "$line" in
      WWFL_CMS_URL=*|WWFL_CMS_API_KEY=*|KECKTECH_CMS_URL=*|KECKTECH_CMS_API_KEY=*|JACOB_ROMAN_CMS_URL=*|JACOB_ROMAN_CMS_API_KEY=*|JACOB_CMS_URL=*|JACOB_CMS_API_KEY=*|UNCLEJON_CMS_URL=*|UNCLEJON_CMS_API_KEY=*)
        export "$line"
        ;;
    esac
  done < "$f"
}

load_env .env
load_env .env.production

echo "=== CMS URLs (no secrets) ==="
printf 'WWFL_CMS_URL=%s\n' "${WWFL_CMS_URL:-}"
printf 'KECKTECH_CMS_URL=%s\n' "${KECKTECH_CMS_URL:-}"
printf 'JACOB_ROMAN_CMS_URL=%s\n' "${JACOB_ROMAN_CMS_URL:-${JACOB_CMS_URL:-}}"
printf 'UNCLEJON_CMS_URL=%s\n' "${UNCLEJON_CMS_URL:-}"

probe() {
  local name="$1" url="$2" key="$3"
  if [ -z "${url:-}" ] || [ -z "${key:-}" ]; then
    echo "$name MISSING_URL_OR_KEY"
    return 0
  fi
  for path in posts projects; do
    local outfile="/tmp/probe_${name}_${path}.json"
    local code
    code=$(curl -sS -o "$outfile" -w "%{http_code}" -H "Authorization: Bearer ${key}" "${url%/}/api/me-manager/${path}" || echo ERR)
    local count
    count=$(python3 - <<PY
import json
try:
  d=json.load(open("$outfile"))
  if isinstance(d, list):
    print(len(d))
  elif isinstance(d, dict):
    for k in ("posts","projects","items","data"):
      if isinstance(d.get(k), list):
        print(len(d[k])); break
    else:
      print(d.get("count","?"))
  else:
    print("?")
except Exception as e:
  print("parse_err")
PY
)
    echo "$name $path HTTP=$code count=$count"
  done
}

probe wwfl "${WWFL_CMS_URL:-}" "${WWFL_CMS_API_KEY:-}"
probe kecktech "${KECKTECH_CMS_URL:-}" "${KECKTECH_CMS_API_KEY:-}"
probe jacob "${JACOB_ROMAN_CMS_URL:-${JACOB_CMS_URL:-}}" "${JACOB_ROMAN_CMS_API_KEY:-${JACOB_CMS_API_KEY:-}}"
probe unclejon "${UNCLEJON_CMS_URL:-}" "${UNCLEJON_CMS_API_KEY:-}"

echo "=== Properties ==="
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U me_manager -d me_manager -c \
  'SELECT "siteKey", "cmsEnabled", "cmsBaseUrl" FROM "Property" WHERE "siteKey" IS NOT NULL ORDER BY "siteKey";'

echo "=== SitePost published counts ==="
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U me_manager -d me_manager -c \
  'SELECT site, published, count(*) FROM "SitePost" GROUP BY 1,2 ORDER BY 1,2;'

echo "=== Portfolio kecktech displaySites ==="
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U me_manager -d me_manager -c \
  'SELECT slug, title, "displaySites" FROM "PortfolioItem" WHERE '\''kecktech'\'' = ANY("displaySites") ORDER BY slug;'
