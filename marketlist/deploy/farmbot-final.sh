#!/bin/bash
set -eu
set -o pipefail
cd /opt/farmbot/Farmbot-Web-App
docker ps -aq --filter name=farmbot-web-app-web-run | xargs -r docker rm -f || true
echo "Migrating..."
docker compose run --rm web bundle exec rails db:create db:migrate
echo "Starting stack..."
docker compose up -d
echo FARMBOT_INSTALL_COMPLETE
docker compose ps
ss -lntp | grep -E ':3000|:8883|:3002|:15675' || true
curl -fsS -o /dev/null -w "local:%{http_code}\n" http://127.0.0.1:3000/ || true
