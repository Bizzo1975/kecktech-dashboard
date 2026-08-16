#!/usr/bin/env bash
set -euo pipefail

# Switch remoted-managed token run -> local credentials + config.yml ingress
# so marketlist.kecktech.net is honored. Rolls back if an existing public host fails.

ACCOUNT=cfa646f7d4a5672cc944b4cd154a1bc9
TUNNEL=f27a9fb9-7316-4bd9-a271-90982e0271c6
CONF=/etc/cloudflared/config.yml
CRED=/etc/cloudflared/${TUNNEL}.json
UNIT=/etc/systemd/system/cloudflared.service
BAK_DIR=/etc/cloudflared/bak.marketlist.$(date +%Y%m%d%H%M%S)

sudo mkdir -p "$BAK_DIR"
sudo cp -a "$CONF" "$UNIT" "$BAK_DIR/"
echo "Backup: $BAK_DIR"

TOKEN=$(sudo grep -oE 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*|eyJ[A-Za-z0-9+/=]+' "$UNIT" | head -1)
if [ -z "$TOKEN" ]; then
  # token may be single-segment base64 JSON (cloudflare tunnel tokens often are)
  TOKEN=$(sudo sed -n 's/.*--token //p' "$UNIT" | awk '{print $1}')
fi
if [ -z "$TOKEN" ]; then
  echo "Could not extract tunnel token from systemd unit"
  exit 1
fi

python3 - "$TOKEN" "$CRED" "$ACCOUNT" "$TUNNEL" <<'PY'
import base64, json, sys
token, cred_path, account, tunnel = sys.argv[1:5]
# tunnel tokens are often raw base64 of JSON (no JWT dots)
pad = "=" * (-len(token) % 4)
raw = base64.urlsafe_b64decode(token + pad)
data = json.loads(raw)
secret = data["s"]
payload = {
    "AccountTag": data.get("a", account),
    "TunnelID": data.get("t", tunnel),
    "TunnelSecret": secret,
}
open("/tmp/marketlist-tunnel-cred.json", "w").write(json.dumps(payload))
print("credentials_built", payload["AccountTag"], payload["TunnelID"])
PY

sudo mv /tmp/marketlist-tunnel-cred.json "$CRED"
sudo chmod 600 "$CRED"
sudo chown root:root "$CRED"

# Ensure local config has credentials-file + marketlist hostname
sudo python3 - "$CONF" "$CRED" <<'PY'
import sys
from pathlib import Path
conf_path, cred = Path(sys.argv[1]), sys.argv[2]
text = conf_path.read_text()
lines = text.splitlines()
out = []
has_cred = False
has_market = False
for line in lines:
    if line.strip().startswith("credentials-file:"):
        has_cred = True
        out.append(f"credentials-file: {cred}")
        continue
    if "hostname: marketlist.kecktech.net" in line:
        has_market = True
    out.append(line)
if not has_cred:
    # insert after tunnel: line
    new = []
    inserted = False
    for line in out:
        new.append(line)
        if not inserted and line.strip().startswith("tunnel:"):
            new.append(f"credentials-file: {cred}")
            inserted = True
    out = new
if not has_market:
    # insert before catch-all http_status
    new = []
    inserted = False
    for line in out:
        if (not inserted) and "http_status:404" in line:
            new.append("  - hostname: marketlist.kecktech.net")
            new.append("    service: https://localhost:443")
            inserted = True
        new.append(line)
    out = new
Path("/tmp/marketlist-cloudflared-config.yml").write_text("\n".join(out) + "\n")
print("config_ready", "cred", True, "marketlist", True)
PY

sudo cp /tmp/marketlist-cloudflared-config.yml "$CONF"
sudo chmod 644 "$CONF"

# Rewrite systemd unit to local config run (no --token)
sudo tee "$UNIT" >/dev/null <<EOF
[Unit]
Description=cloudflared
After=network-online.target
Wants=network-online.target

[Service]
TimeoutStartSec=15
Type=notify
ExecStart=/usr/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl restart cloudflared
sleep 4
sudo systemctl is-active cloudflared
sudo journalctl -u cloudflared -n 25 --no-pager

echo "=== verify existing public host via CF edge ==="
# Resolve kecktech.net via 1.1.1.1 and hit with Host
IP=$(dig +short kecktech.net @1.1.1.1 | head -1)
CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 --resolve "kecktech.net:443:${IP}" https://kecktech.net/ || true)
echo "kecktech.net via ${IP} -> ${CODE}"
MIP=$(dig +short marketlist.kecktech.net @1.1.1.1 | head -1)
MCODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 --resolve "marketlist.kecktech.net:443:${MIP}" https://marketlist.kecktech.net/ || true)
echo "marketlist via ${MIP} -> ${MCODE}"
HEALTH=$(curl -sS --max-time 20 --resolve "marketlist.kecktech.net:443:${MIP}" https://marketlist.kecktech.net/api/health || true)
echo "health: ${HEALTH}"

if [ "$CODE" != "200" ] && [ "$CODE" != "302" ] && [ "$CODE" != "301" ] && [ "$CODE" != "401" ] && [ "$CODE" != "403" ]; then
  echo "ROLLBACK: existing site failed with ${CODE}"
  sudo cp -a "$BAK_DIR/config.yml" "$CONF"
  sudo cp -a "$BAK_DIR/cloudflared.service" "$UNIT"
  sudo systemctl daemon-reload
  sudo systemctl restart cloudflared
  sleep 3
  sudo systemctl is-active cloudflared
  exit 1
fi

if [ "$MCODE" != "200" ]; then
  echo "WARN: marketlist not 200 yet (${MCODE}) — config applied, check ingress"
  sudo grep -A1 marketlist "$CONF" || true
  exit 2
fi

echo "SUCCESS"
