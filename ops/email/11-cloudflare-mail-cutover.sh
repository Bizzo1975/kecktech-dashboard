#!/usr/bin/env bash
# Cloudflare MAIL-ONLY cutover for Kecktech domains.
# Runs on Traefik host with /opt/docker/.env CF token.
# Does NOT touch LAN DNS / Unbound / AdGuard.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/docker/.env}"
MX_TARGET="${MX_TARGET:-kecktechitsolutions.mail.protection.outlook.com}"
SPF_VALUE='v=spf1 include:spf.protection.outlook.com -all'
DMARC_VALUE='v=DMARC1; p=none; rua=mailto:support@kecktech.net'
DOMAINS=(kecktech.net willworkforlunch.com jacob-roman.com unclejonsitgarage.com)

eval "$(grep -E '^(CF_|CLOUDFLARE)' "$ENV_FILE" | sed 's/\r$//')"
TOKEN="${CF_DNS_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}}"
if [[ -z "${TOKEN}" ]]; then
  echo "NO_TOKEN in $ENV_FILE" >&2
  exit 2
fi
export TOKEN

api() {
  local method="$1" url="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -sS -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data "$data" "$url"
  else
    curl -sS -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$url"
  fi
}

zone_id() {
  local name="$1"
  api GET "https://api.cloudflare.com/client/v4/zones?name=${name}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('success') and d.get('result') else '')"
}

cf_py() {
  python3 - "$@" <<'PY'
import json, sys, urllib.request, os

token = os.environ["TOKEN"]

def req(method, url, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(r) as resp:
        return json.load(resp)

op = sys.argv[1]
zid = sys.argv[2]

if op == "mx":
    domain, mx = sys.argv[3], sys.argv[4]
    d = req("GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?type=MX&name={domain}")
    recs = d.get("result") or []
    payload = {"type": "MX", "name": domain, "content": mx, "priority": 0, "ttl": 300, "proxied": False}
    for r in recs:
        if r.get("content", "").rstrip(".").lower() != mx.lower():
            print("delete MX", r.get("content"), r["id"])
            req("DELETE", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{r['id']}")
    left = [r for r in recs if r.get("content", "").rstrip(".").lower() == mx.lower()]
    if left:
        print("keep/patch MX", left[0]["id"])
        print(req("PUT", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{left[0]['id']}", payload))
    else:
        print("create MX")
        print(req("POST", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records", payload))

elif op == "spf":
    domain, spf = sys.argv[3], sys.argv[4]
    d = req("GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?type=TXT&name={domain}")
    recs = d.get("result") or []
    spf_recs = [r for r in recs if str(r.get("content", "")).lower().startswith("v=spf1")]
    payload = {"type": "TXT", "name": domain, "content": spf, "ttl": 300}
    if spf_recs:
        print("patch SPF", spf_recs[0]["id"])
        print(req("PUT", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{spf_recs[0]['id']}", payload))
        for r in spf_recs[1:]:
            print("delete extra SPF", r["id"])
            req("DELETE", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{r['id']}")
    else:
        print("create SPF")
        print(req("POST", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records", payload))

elif op == "cname":
    name, target = sys.argv[3], sys.argv[4]
    d = req("GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?type=CNAME&name={name}")
    recs = d.get("result") or []
    payload = {"type": "CNAME", "name": name, "content": target, "ttl": 300, "proxied": False}
    if recs:
        print("patch CNAME", name, recs[0]["id"])
        print(req("PUT", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{recs[0]['id']}", payload))
    else:
        print("create CNAME", name)
        print(req("POST", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records", payload))

elif op == "dmarc":
    name, val = sys.argv[3], sys.argv[4]
    d = req("GET", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?type=TXT&name={name}")
    recs = d.get("result") or []
    payload = {"type": "TXT", "name": name, "content": val, "ttl": 300}
    if recs:
        print("patch DMARC", recs[0]["id"])
        print(req("PUT", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records/{recs[0]['id']}", payload))
    else:
        print("create DMARC")
        print(req("POST", f"https://api.cloudflare.com/client/v4/zones/{zid}/dns_records", payload))
else:
    raise SystemExit(f"unknown op {op}")
PY
}

for domain in "${DOMAINS[@]}"; do
  echo "==== DOMAIN $domain ===="
  zid=$(zone_id "$domain")
  if [[ -z "$zid" ]]; then echo "NO_ZONE $domain"; continue; fi
  echo "zone=$zid"
  cf_py mx "$zid" "$domain" "$MX_TARGET"
  cf_py spf "$zid" "$domain" "$SPF_VALUE"
  cf_py cname "$zid" "autodiscover.${domain}" "autodiscover.outlook.com"
  cf_py dmarc "$zid" "_dmarc.${domain}" "$DMARC_VALUE"
  echo "DONE $domain"
done
echo "ALL_MAIL_RECORDS_UPDATED"
