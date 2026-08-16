#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(sudo grep -E '^CF_DNS_API_TOKEN=' /opt/docker/.env | cut -d= -f2- | tr -d "\"'\r")
AUTH="Authorization: Bearer ${TOKEN}"
ZONE=b05efebc83e5bbe1d399055f42810a9b
TMP=$(mktemp)
curl -fsS -H "$AUTH" "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records?name=marketlist.kecktech.net" >"$TMP"
python3 - "$TMP" <<'PY'
import json, sys, urllib.request, os
d = json.load(open(sys.argv[1]))
token = open("/opt/docker/.env").read()
# token loaded by bash; use env from parent via file written by bash
recs = d.get("result") or []
print("found", len(recs), "records")
open("/tmp/ml_dns_ids.txt", "w").write("\n".join(r["id"] for r in recs) + ("\n" if recs else ""))
for r in recs:
    print(r["id"], r["type"], r["content"])
PY

if [ ! -s /tmp/ml_dns_ids.txt ]; then
  echo "No public DNS records to delete"
  exit 0
fi

while IFS= read -r id || [ -n "$id" ]; do
  [ -z "$id" ] && continue
  echo "Deleting $id"
  curl -fsS -X DELETE -H "$AUTH" "https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records/${id}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('deleted', d.get('success'), d.get('errors'))"
done < /tmp/ml_dns_ids.txt

echo "=== public dig (may cache briefly) ==="
dig +short marketlist.kecktech.net @1.1.1.1 || true
echo "=== internal ==="
dig +short marketlist.kecktech.net @10.10.0.1 || true
curl -k -sS --max-time 10 https://marketlist.kecktech.net/api/health
echo
