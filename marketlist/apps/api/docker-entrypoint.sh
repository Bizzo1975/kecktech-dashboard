#!/bin/sh
set -e
cd /app/apps/api
node dist/scripts/migrate-cli.js
node dist/scripts/seed.js || true
exec node dist/server.js
