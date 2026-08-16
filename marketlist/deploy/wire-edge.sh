#!/bin/bash
set -euo pipefail

# Install Traefik route
sudo cp /tmp/marketlist.yml /opt/docker/traefik/dynamic/marketlist.yml
sudo chmod 644 /opt/docker/traefik/dynamic/marketlist.yml

# Add cloudflared hostname if missing
if ! sudo grep -q 'marketlist.kecktech.net' /etc/cloudflared/config.yml; then
  sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.marketlist
  sudo python3 - <<'PY'
from pathlib import Path
path = Path('/etc/cloudflared/config.yml')
text = path.read_text()
needle = '  - service: http_status:404'
insert = '  - hostname: marketlist.kecktech.net\n    service: https://localhost:443\n'
if needle not in text:
    raise SystemExit('catch-all not found')
if 'marketlist.kecktech.net' not in text:
    text = text.replace(needle, insert + needle)
    path.write_text(text)
    print('cloudflared_config_updated')
else:
    print('cloudflared_already_present')
PY
  sudo systemctl restart cloudflared
  sleep 2
  sudo systemctl is-active cloudflared
else
  echo 'cloudflared_already_present'
fi

# DNS CNAME via cloudflared
TUNNEL_ID=$(sudo grep -E '^tunnel:' /etc/cloudflared/config.yml | awk '{print $2}')
echo "tunnel_id=$TUNNEL_ID"
sudo cloudflared tunnel route dns "$TUNNEL_ID" marketlist.kecktech.net || true

echo 'edge_wiring_done'
