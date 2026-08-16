#!/bin/bash
set -eu
set -o pipefail
cd /opt/farmbot/Farmbot-Web-App

pull_retry() {
  local img="$1"
  local n=0
  while [ "$n" -lt 8 ]; do
    n=$((n + 1))
    echo "Pull attempt $n for $img"
    if docker pull "$img"; then
      return 0
    fi
    sleep 10
  done
  return 1
}

pull_retry postgres:17
pull_retry redis:7

echo "Building mqtt (RabbitMQ) image..."
docker compose build mqtt

echo "Installing gems / assets deps..."
docker compose run --rm web gem install bundler
docker compose run --rm web bundle install
docker compose run --rm web bash -lc 'command -v bun >/dev/null && bun install || true'

echo "Migrating DB..."
docker compose run --rm web bundle exec rails db:create db:migrate

echo "Starting stack..."
docker compose up -d
echo FARMBOT_INSTALL_COMPLETE
docker compose ps
ss -lntp | grep -E '3000|8883|3002|15675' || true
curl -fsS -o /dev/null -w "local3000:%{http_code}\n" http://127.0.0.1:3000/ || true
