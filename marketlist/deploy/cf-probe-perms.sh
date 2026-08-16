#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(sudo grep -E '^CF_DNS_API_TOKEN=' /opt/docker/.env | cut -d= -f2- | tr -d "\"'\r")
AUTH="Authorization: Bearer ${TOKEN}"
ACCOUNT=cfa646f7d4a5672cc944b4cd154a1bc9
TUNNEL=f27a9fb9-7316-4bd9-a271-90982e0271c6
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

summarize() {
  local label="$1" file="$2"
  python3 - "$label" "$file" <<'PY'
import json,sys
label, path = sys.argv[1], sys.argv[2]
d=json.load(open(path))
print(label, "success=", d.get("success"), "errors=", d.get("errors"))
if isinstance(d.get("result"), dict) and "status" in d["result"]:
    print(label, "status=", d["result"].get("status"))
if isinstance(d.get("result"), list):
    print(label, "count=", len(d["result"]))
PY
}

curl -sS -H "$AUTH" https://api.cloudflare.com/client/v4/user/tokens/verify >"$TMP/verify.json"
summarize verify "$TMP/verify.json"

curl -sS -H "$AUTH" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/cfd_tunnel" >"$TMP/list.json"
summarize tunnels_list "$TMP/list.json"

curl -sS -H "$AUTH" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL}/configurations" >"$TMP/cfg.json"
summarize tunnel_cfg "$TMP/cfg.json"

# DNS already works with this token - confirm marketlist record
ZONE=b05efebc83e5bbe1d399055f42810a9b
curl -sS -H "$AUTH" "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records?name=marketlist.kecktech.net" >"$TMP/dns.json"
python3 - "$TMP/dns.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
recs=d.get("result") or []
print("dns_marketlist", [(r.get("type"), r.get("content"), r.get("proxied")) for r in recs])
PY
