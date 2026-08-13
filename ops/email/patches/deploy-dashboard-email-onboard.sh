#!/bin/bash
set -euo pipefail
BUILD=/tmp/dashboard-build
rm -rf "$BUILD"
mkdir -p "$BUILD"
tar -xzf /tmp/dashboard-src.tgz -C "$BUILD"
cd "$BUILD"
# Ensure data dir exists
mkdir -p data
# Seed registry volume on host
sudo mkdir -p /opt/docker/dashboard/data
if [ ! -f /opt/docker/dashboard/data/contacts-registry.json ]; then
  sudo cp data/contacts-registry.json /opt/docker/dashboard/data/contacts-registry.json
  sudo chown -R deploy:deploy /opt/docker/dashboard/data || sudo chown -R kecktech:kecktech /opt/docker/dashboard/data || true
fi
echo "Building kecktech/dashboard:latest ..."
sudo docker build -t kecktech/dashboard:latest .
# Patch compose for registry volume + env if missing
COMPOSE=/opt/docker/dashboard/docker-compose.yml
if ! grep -q 'contacts-registry\|EMAIL_REGISTRY_PATH\|./data:' "$COMPOSE"; then
  sudo cp "$COMPOSE" "$COMPOSE.bak-email-onboard-$(date +%Y%m%d%H%M%S)"
  python3 - <<'PY'
from pathlib import Path
p = Path("/opt/docker/dashboard/docker-compose.yml")
t = p.read_text()
if "EMAIL_REGISTRY_PATH" not in t:
    t = t.replace(
        "environment:\n",
        "environment:\n      - EMAIL_REGISTRY_PATH=/app/data/contacts-registry.json\n",
        1,
    )
if "./data:" not in t and "contacts-registry" not in t:
    # insert volumes under dashboard service after environment block or ports
    needle = "    networks:"
    if "    volumes:" not in t.split("dashboard:")[1].split("networks:")[0]:
        t = t.replace(
            "    networks:\n",
            "    volumes:\n      - ./data:/app/data\n    networks:\n",
            1,
        )
p.write_text(t)
print("compose patched")
PY
fi
cd /opt/docker/dashboard
sudo docker compose up -d dashboard
sleep 4
sudo docker compose ps dashboard
curl -sS -o /dev/null -w "local_dash=%{http_code}\n" http://127.0.0.1:8080/ || true
echo DONE
