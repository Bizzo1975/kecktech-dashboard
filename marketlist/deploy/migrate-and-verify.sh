#!/bin/bash
set -eux
MIGRATE=$(sudo docker exec marketlist-api-1 find /app -name 'migrate.js' 2>/dev/null | head -1)
echo "MIGRATE=$MIGRATE"
if [ -n "$MIGRATE" ]; then
  sudo docker exec marketlist-api-1 node "$MIGRATE"
  echo MIGRATE_OK
else
  sudo docker exec marketlist-api-1 ls -la /app
  sudo docker exec marketlist-api-1 find /app -maxdepth 4 -type f -name '*.js' | head -40
  echo NO_MIGRATE
fi
curl -sS --max-time 8 http://127.0.0.1:8091/api/health
echo
curl -sS --max-time 8 -o /dev/null -w "WEBLOCAL:%{http_code}\n" http://127.0.0.1:8090/
curl -sS --max-time 8 -o /dev/null -w "PUB:%{http_code}\n" https://marketlist.kecktech.net/
curl -sS --max-time 8 -o /dev/null -w "PUBAPI:%{http_code}\n" https://marketlist.kecktech.net/api/health
echo ALL_DONE
