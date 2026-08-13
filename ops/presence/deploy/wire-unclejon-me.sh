#!/bin/bash
# Wire UNCLEJON_CMS_* on me-manager from UJ host cms key. Never prints secrets.
set -euo pipefail

UJ_HOST="${UJ_HOST:-10.20.0.202}"
ME_ENV="${ME_ENV:-/opt/me-manager/.env.production}"
CMS_URL="${CMS_URL:-https://www.unclejonsitgarage.com}"

KEY=$(ssh -o BatchMode=yes -o HostName="$UJ_HOST" ctrlpanel 'cat /opt/unclejonsitgarage-site/.cms_api_key 2>/dev/null || cat /opt/unclejons-itgarage-site/.cms_api_key')
if [[ -z "$KEY" ]]; then
  echo "NO_KEY"
  exit 1
fi

# Probe bridge without printing key
code=$(curl -sS -m 20 -o /tmp/uj-posts.json -w '%{http_code}' \
  -H "Authorization: Bearer $KEY" \
  "$CMS_URL/api/me-manager/posts")
echo "BRIDGE_HTTP $code"
if [[ "$code" != "200" ]]; then
  head -c 200 /tmp/uj-posts.json || true
  echo
  exit 2
fi

python3 - <<PY
from pathlib import Path
path = Path("$ME_ENV")
text = path.read_text(encoding="utf-8")
lines = text.splitlines()
kv = {
  "UNCLEJON_CMS_URL": "$CMS_URL",
  "UNCLEJON_CMS_API_KEY": """$KEY""",
}
out = []
seen = set()
for line in lines:
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0].strip()
        if k in kv:
            out.append(f"{k}={kv[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in kv.items():
    if k not in seen:
        out.append(f"{k}={v}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("ENV_UPDATED", ",".join(sorted(kv)))
PY
