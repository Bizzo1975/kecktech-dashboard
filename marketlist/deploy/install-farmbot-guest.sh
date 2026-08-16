#!/usr/bin/env bash
# Install FarmBot Web App on prod-farmbot-01 (run ON the guest as root after first boot).
# Usage: bash deploy/install-farmbot-guest.sh
set -eu
# Note: keep this file LF line endings (CRLF breaks bash on Linux guests).
set -o pipefail

APP_DIR=/opt/farmbot/Farmbot-Web-App
API_HOST="${API_HOST:-farmbot.kecktech.net}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git openssl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p /opt/farmbot /opt/farmbot/patches
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone https://github.com/FarmBot/Farmbot-Web-App --depth=5 --branch=main "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  cp example.env .env
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  DEVISE_SECRET="$(openssl rand -hex 64)"
  ADMIN_PASSWORD="$(openssl rand -hex 16)"
  SECRET_KEY_BASE="$(openssl rand -hex 64)"
  # Strip sample RSA_KEY / cloud provider lines; set required hosts
  sed -i '/^RSA_KEY=/d' .env
  sed -i '/GCS_/d; /CLOUDAMQP/d; /HEROKU/d' .env || true
  {
    echo "API_HOST=${API_HOST}"
    echo "API_PORT=3000"
    echo "MQTT_HOST=${API_HOST}"
    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
    echo "DEVISE_SECRET=${DEVISE_SECRET}"
    echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}"
    echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}"
    echo "RAILS_ENV=production"
    echo "NO_EMAILS=TRUE"
    echo "FORCE_SSL=TRUE"
    echo "MQTT_WS=wss://${API_HOST}:3002/ws"
  } >> .env
  echo "Wrote .env — ADMIN_PASSWORD saved in ${APP_DIR}/.env"
fi

# CSP patch: allow Marketlist iframe
if grep -q "frame_ancestors" config/application.rb; then
  if ! grep -q "marketlist.kecktech.net" config/application.rb; then
    cp config/application.rb "config/application.rb.bak.$(date +%Y%m%d%H%M%S)"
    sed -i "s|frame_ancestors: %w('self'|frame_ancestors: %w('self' https://marketlist.kecktech.net|" config/application.rb
    echo "Applied frame_ancestors Marketlist patch"
  fi
fi

docker compose build web
docker compose run --rm web gem install bundler
docker compose run --rm web bundle install
docker compose run --rm web bun install || docker compose run --rm web yarn install || true
docker compose run --rm web bundle exec rails db:create db:migrate
docker compose up -d

echo "FarmBot install started. Wait for assets; then open https://${API_HOST}/"
echo "Re-check: docker compose ps; docker compose logs -f web"
