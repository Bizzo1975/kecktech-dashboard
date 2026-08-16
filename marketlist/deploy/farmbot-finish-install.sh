#!/bin/bash
set -eu
set -o pipefail
cd /opt/farmbot/Farmbot-Web-App
docker compose build --no-cache web
docker compose run --rm web gem install bundler
docker compose run --rm web bundle install
docker compose run --rm web bash -lc 'if command -v bun >/dev/null; then bun install; elif command -v npm >/dev/null; then npm install; else yarn install || true; fi'
docker compose run --rm web bundle exec rails db:create db:migrate
docker compose up -d
echo FARMBOT_INSTALL_COMPLETE
docker compose ps
