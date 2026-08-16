#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-dashboard}"
REMOTE_DIR="${REMOTE_DIR:-/opt/docker/marketlist}"

echo "Deploying Marketlist to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p ${REMOTE_DIR}"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude apps/mobile/.expo \
  --exclude '**/dist' \
  --exclude '.env' \
  --exclude 'GroceryApp' \
  --exclude 'src' \
  ./ "${HOST}:${REMOTE_DIR}/"

if ! ssh -o BatchMode=yes "$HOST" "test -f ${REMOTE_DIR}/.env"; then
  echo "Creating production .env on server..."
  PASS="$(openssl rand -hex 16)"
  JWT="$(openssl rand -hex 32)"
  REFRESH="$(openssl rand -hex 32)"
  ssh -o BatchMode=yes "$HOST" "cat > ${REMOTE_DIR}/.env <<EOF
DB_NAME=grocery_app
DB_USER=marketlist
DB_PASSWORD=${PASS}
JWT_SECRET=${JWT}
JWT_REFRESH_SECRET=${REFRESH}
JWT_EXPIRES_IN=15m
JWT_REFRESH_DAYS=7
NODE_ENV=production
EOF"
fi

ssh -o BatchMode=yes "$HOST" "cd ${REMOTE_DIR}; docker compose -f docker-compose.prod.yml build; docker compose -f docker-compose.prod.yml up -d"

echo "Waiting for API health on ${HOST}:8091..."
for i in $(seq 1 60); do
  if ssh -o BatchMode=yes "$HOST" "curl -fsS http://127.0.0.1:8091/api/health >/dev/null"; then
    echo "API healthy"
    break
  fi
  sleep 3
done

ssh -o BatchMode=yes "$HOST" "curl -fsS http://127.0.0.1:8091/api/health; echo; curl -fsSI http://127.0.0.1:8090 | head -5"
echo "Deploy complete."
