#!/bin/bash
set -eux
cd /opt/docker/marketlist
sudo docker compose -f docker-compose.prod.yml stop api web || true
sudo docker rm -f marketlist-api-1 marketlist-web-1 cef8ab943264_marketlist-api-1 1e0d3e1c0e17 2>/dev/null || true
sudo docker compose -f docker-compose.prod.yml up -d --no-build --force-recreate --remove-orphans api web
sleep 8
sudo docker compose -f docker-compose.prod.yml ps -a
echo "LOCAL_HEALTH:"
curl -sS http://127.0.0.1:8091/api/health || true
echo
echo -n "PUB:"
curl -sS -o /dev/null -w "%{http_code}\n" https://marketlist.kecktech.net/api/health || true
MIGRATE=""
if sudo docker exec marketlist-api-1 test -f /app/dist/scripts/migrate.js; then
  MIGRATE=/app/dist/scripts/migrate.js
elif sudo docker exec marketlist-api-1 test -f /app/apps/api/dist/scripts/migrate.js; then
  MIGRATE=/app/apps/api/dist/scripts/migrate.js
else
  MIGRATE=$(sudo docker exec marketlist-api-1 sh -c 'find /app -name migrate.js 2>/dev/null | head -1' || true)
fi
if [ -n "$MIGRATE" ]; then
  echo "RUNNING_MIGRATE:$MIGRATE"
  sudo docker exec marketlist-api-1 node "$MIGRATE" || true
else
  echo "NO_MIGRATE_SCRIPT_FOUND"
fi
echo DEPLOY_DONE
