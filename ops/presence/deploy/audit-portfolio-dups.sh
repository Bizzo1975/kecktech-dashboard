#!/bin/bash
set -euo pipefail
cd /opt/me-manager
ENVF=.env.production
USER=$(grep -E '^POSTGRES_USER=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r"' | tr -d "'")
DB=$(grep -E '^POSTGRES_DB=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r"' | tr -d "'")
PASS=$(grep -E '^POSTGRES_PASSWORD=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r"' | tr -d "'")
echo "DB=$DB USER=$USER"
export PGPASSWORD="$PASS"
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T -e PGPASSWORD="$PASS" postgres \
  psql -U "$USER" -d "$DB" -c 'SELECT count(*) AS portfolio_total FROM "PortfolioItem";'
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T -e PGPASSWORD="$PASS" postgres \
  psql -U "$USER" -d "$DB" -c 'SELECT id, title, "liveUrl", stage, "displaySites" FROM "PortfolioItem" WHERE '\''kecktech'\'' = ANY("displaySites") ORDER BY lower(title);'
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T -e PGPASSWORD="$PASS" postgres \
  psql -U "$USER" -d "$DB" -c 'SELECT "liveUrl", count(*) AS n, string_agg(title, '\'' | '\'') AS titles FROM "PortfolioItem" WHERE "liveUrl" IS NOT NULL AND "liveUrl" <> '\'''\'' GROUP BY "liveUrl" HAVING count(*) > 1 ORDER BY n DESC;'
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T -e PGPASSWORD="$PASS" postgres \
  psql -U "$USER" -d "$DB" -c 'SELECT lower(title) AS t, count(*) AS n FROM "PortfolioItem" GROUP BY lower(title) HAVING count(*) > 1 ORDER BY n DESC;'
