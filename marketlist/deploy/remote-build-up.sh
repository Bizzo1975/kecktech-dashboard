#!/usr/bin/env bash
set -euo pipefail
REMOTE_DIR=/opt/docker/marketlist
cd "$REMOTE_DIR"

# Prefer rsynced/git-like tree; ensure compose exists
if [ ! -f docker-compose.prod.yml ]; then
  echo "missing compose"
  exit 1
fi

if [ ! -f .env ]; then
  PASS=$(openssl rand -hex 16)
  JWT=$(openssl rand -hex 32)
  REF=$(openssl rand -hex 32)
  cat > .env <<EOF
DB_NAME=grocery_app
DB_USER=marketlist
DB_PASSWORD=${PASS}
JWT_SECRET=${JWT}
JWT_REFRESH_SECRET=${REF}
JWT_EXPIRES_IN=15m
JWT_REFRESH_DAYS=7
NODE_ENV=production
EOF
  echo "created_env"
else
  echo "existing_env"
fi

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo "waiting_health"
for i in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:8091/api/health >/dev/null 2>&1; then
    echo "api_healthy"
    curl -fsS http://127.0.0.1:8091/api/health
    echo
    curl -fsSI http://127.0.0.1:8090 | head -8
    # Re-seed demo if script available via container
    docker compose -f docker-compose.prod.yml exec -T api node dist/scripts/seed.js 2>/dev/null || \
      docker compose -f docker-compose.prod.yml exec -T api npm run seed --if-present 2>/dev/null || \
      echo "seed_skipped"
    exit 0
  fi
  sleep 3
done
echo "health_timeout"
docker compose -f docker-compose.prod.yml logs --tail 100
exit 1
