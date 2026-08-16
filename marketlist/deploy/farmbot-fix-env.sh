#!/bin/bash
set -eu
cd /opt/farmbot/Farmbot-Web-App
PW=$(grep '^POSTGRES_PASSWORD=' .env | grep -v '^\s*#' | tail -1 | cut -d= -f2-)
ADMIN=$(grep '^ADMIN_PASSWORD=' .env | grep -v '^\s*#' | tail -1 | cut -d= -f2- || true)
DEVISE=$(grep '^DEVISE_SECRET=' .env | grep -v '^\s*#' | tail -1 | cut -d= -f2- || true)
SECRET=$(grep '^SECRET_KEY_BASE=' .env | grep -v '^\s*#' | tail -1 | cut -d= -f2- || true)
cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
cat > .env <<EOF
API_HOST=farmbot.kecktech.net
API_PORT=3000
MQTT_HOST=farmbot.kecktech.net
POSTGRES_PASSWORD=${PW}
DEVISE_SECRET=${DEVISE}
ADMIN_PASSWORD=${ADMIN}
SECRET_KEY_BASE=${SECRET}
RAILS_ENV=production
NO_EMAILS=TRUE
FORCE_SSL=TRUE
MQTT_WS=wss://farmbot.kecktech.net:3002/ws
EOF
# Do NOT set DATABASE_URL — database.yml uses host=db + POSTGRES_PASSWORD
echo "Wrote clean .env"
grep -E '^(API_HOST|MQTT_HOST|MQTT_WS|FORCE_SSL|RAILS_ENV)=' .env
bash /tmp/farmbot-final.sh
