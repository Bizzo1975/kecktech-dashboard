#!/usr/bin/env bash
# Windows-friendly deploy (tar + scp) when rsync is unavailable.
set -euo pipefail

HOST="${DEPLOY_HOST:-dashboard}"
REMOTE_DIR="${REMOTE_DIR:-/opt/docker/marketlist}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="marketlist-deploy-${STAMP}.tar.gz"

echo "Packing repo (excluding node_modules, .git, dist, .env)..."
tar -czf "/tmp/${ARCHIVE}" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=apps/mobile/.expo \
  --exclude='*/dist' \
  --exclude=.env \
  --exclude=GroceryApp \
  --exclude=src \
  -C "$(pwd)" .

echo "Uploading to ${HOST}:${REMOTE_DIR}..."
ssh -o BatchMode=yes "$HOST" "mkdir -p ${REMOTE_DIR}"
scp -o BatchMode=yes "/tmp/${ARCHIVE}" "${HOST}:/tmp/${ARCHIVE}"
ssh -o BatchMode=yes "$HOST" "mkdir -p ${REMOTE_DIR} && tar -xzf /tmp/${ARCHIVE} -C ${REMOTE_DIR} && rm -f /tmp/${ARCHIVE}"

if ! ssh -o BatchMode=yes "$HOST" "test -f ${REMOTE_DIR}/.env"; then
  echo "Creating production .env on server..."
  PASS="$(openssl rand -hex 16 2>/dev/null || powershell -Command "[guid]::NewGuid().ToString('N').Substring(0,32)")"
  JWT="$(openssl rand -hex 32 2>/dev/null || powershell -Command "[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')")"
  REFRESH="$(openssl rand -hex 32 2>/dev/null || powershell -Command "[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')")"
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

echo "Building and starting compose..."
ssh -o BatchMode=yes "$HOST" "cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d"

echo "Waiting for API health..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if ssh -o BatchMode=yes "$HOST" "curl -fsS http://127.0.0.1:8091/api/health >/dev/null"; then
    echo "API healthy."
    rm -f "/tmp/${ARCHIVE}"
    exit 0
  fi
  sleep 5
done

echo "WARNING: API health check did not pass in time"
exit 1
