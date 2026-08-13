#!/bin/bash
set -euo pipefail
cd /opt/unclejons-itgarage-site
set -a
# shellcheck disable=SC1091
source .env.production
set +a
tmp=$(mktemp)
# Skip CREATE DATABASE / \c — DB already created by the Postgres image.
grep -v -E '^(CREATE DATABASE|\\c )' config/init.sql > "$tmp"
docker compose -f docker-compose.uj.yml --env-file .env.production exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$tmp"
rm -f "$tmp"
docker compose -f docker-compose.uj.yml --env-file .env.production exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt'
echo SCHEMA_OK
