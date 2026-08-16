#!/usr/bin/env bash
set -euo pipefail

TOKEN=$(sudo grep -E '^CF_DNS_API_TOKEN=' /opt/docker/.env | cut -d= -f2- | tr -d "\"'\r")
ACCOUNT=cfa646f7d4a5672cc944b4cd154a1bc9
TUNNEL=f27a9fb9-7316-4bd9-a271-90982e0271c6
AUTH="Authorization: Bearer ${TOKEN}"
CT="Content-Type: application/json"
TARGET="${TUNNEL}.cfargotunnel.com"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== zone lookup ==="
curl -fsS -H "$AUTH" "https://api.cloudflare.com/client/v4/zones?name=kecktech.net" >"$TMPDIR/zone.json"
ZONE=$(python3 -c "import json; d=json.load(open('$TMPDIR/zone.json')); print(d['result'][0]['id'] if d.get('success') and d.get('result') else '')")
echo "zone=${ZONE}"
if [ -z "$ZONE" ]; then
  python3 -c "import json; print(json.load(open('$TMPDIR/zone.json')).get('errors'))"
  exit 1
fi

echo "=== DNS marketlist ==="
curl -fsS -H "$AUTH" "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records?name=marketlist.kecktech.net" >"$TMPDIR/dns.json"
REC_ID=$(python3 -c "import json; d=json.load(open('$TMPDIR/dns.json')); r=d.get('result') or []; print(r[0]['id'] if r else '')")
if [ -z "$REC_ID" ]; then
  echo "Creating CNAME marketlist -> ${TARGET}"
  curl -fsS -X POST -H "$AUTH" -H "$CT" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records" \
    --data "{\"type\":\"CNAME\",\"name\":\"marketlist\",\"content\":\"${TARGET}\",\"proxied\":true,\"ttl\":1}" \
    >"$TMPDIR/dns_write.json"
else
  echo "Updating existing record ${REC_ID}"
  curl -fsS -X PUT -H "$AUTH" -H "$CT" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records/${REC_ID}" \
    --data "{\"type\":\"CNAME\",\"name\":\"marketlist\",\"content\":\"${TARGET}\",\"proxied\":true,\"ttl\":1}" \
    >"$TMPDIR/dns_write.json"
fi
python3 -c "import json; d=json.load(open('$TMPDIR/dns_write.json')); print('dns', d.get('success'), d.get('errors'))"

echo "=== tunnel config ==="
curl -fsS -H "$AUTH" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL}/configurations" >"$TMPDIR/cfg.json"
python3 -c "import json; d=json.load(open('$TMPDIR/cfg.json')); print('get_success', d.get('success')); print('get_errors', d.get('errors')); c=(d.get('result') or {}).get('config') or {}; print('before', [i.get('hostname') for i in c.get('ingress',[]) if i.get('hostname')])"

python3 - "$TMPDIR/cfg.json" "$TMPDIR/put.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
if not d.get("success"):
    raise SystemExit(f"get failed: {d.get('errors')}")
config = (d.get("result") or {}).get("config") or {}
ingress = list(config.get("ingress") or [])
host = "marketlist.kecktech.net"
named = [i for i in ingress if i.get("hostname")]
catch = [i for i in ingress if not i.get("hostname")]
if not any(i.get("hostname") == host for i in named):
    named.append({
        "hostname": host,
        "service": "https://localhost:443",
        "originRequest": {"noTLSVerify": True},
    })
if not catch:
    catch = [{"service": "http_status:404"}]
config["ingress"] = named + catch
config.setdefault("originRequest", {"noTLSVerify": True})
json.dump({"config": config}, open(dst, "w"))
PY

curl -fsS -X PUT -H "$AUTH" -H "$CT" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL}/configurations" \
  --data @"$TMPDIR/put.json" >"$TMPDIR/put_resp.json"
python3 -c "import json; d=json.load(open('$TMPDIR/put_resp.json')); print('put_success', d.get('success')); print('put_errors', d.get('errors')); c=(d.get('result') or {}).get('config') or {}; print('after', [i.get('hostname') for i in c.get('ingress',[]) if i.get('hostname')])"

echo "=== done ==="
