#!/bin/bash
set -e
cd /opt/docker/personal-website
docker compose -f docker-compose.prod.yml ps app
grep -n listmonkSubscribe src/app/api/newsletter/subscribers/route.ts | head
test -f src/lib/services/listmonk-subscribe.ts && echo helper_ok
cut -d= -f1 .env.production | grep LISTMONK
# multipart contact post via curl inside app network using host published? use docker exec curl if present
docker compose -f docker-compose.prod.yml exec -T app sh -c 'curl -sS -w "\nwwfl_http=%{http_code}\n" -X POST http://127.0.0.1:3000/api/contact \
  -F name="Plan Smoke" \
  -F email="hello@willworkforlunch.com" \
  -F subject="Graph smoke" \
  -F message="confirmation smoke" \
  -F category="general" \
  -F terms="true"' || \
docker compose -f docker-compose.prod.yml exec -T app wget -qO- --post-data='name=Plan%20Smoke&email=hello@willworkforlunch.com&subject=Graph%20smoke&message=confirmation%20smoke&category=general&terms=true' http://127.0.0.1:3000/api/contact
