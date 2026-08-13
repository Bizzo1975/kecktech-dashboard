#!/bin/bash
set -euo pipefail
cd /opt/unclejons-itgarage-site
set -a
# shellcheck disable=SC1091
source .env.production
set +a
docker compose -f docker-compose.uj.yml --env-file .env.production exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
SQL
echo PATCH_OK
