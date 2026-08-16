#!/bin/bash
# Wire UNCLEJON CMS env on me-manager host. Never prints secrets.
set -euo pipefail
ME_ENV=/opt/me-manager/.env.production
CMS_URL=https://www.unclejonsitgarage.com
KEY=$(ssh -o BatchMode=yes -o HostName=10.20.0.202 ctrlpanel 'cat /opt/unclejons-itgarage-site/.cms_api_key')
test -n "$KEY"
code=$(curl -sS -m 20 -o /tmp/uj-posts.json -w '%{http_code}' -H "Authorization: Bearer ${KEY}" "${CMS_URL}/api/me-manager/posts")
echo "BRIDGE_HTTP ${code}"
test "$code" = "200"
export UJ_KEY="$KEY"
export UJ_URL="$CMS_URL"
python3 - <<'PY'
from pathlib import Path
import os
path = Path("/opt/me-manager/.env.production")
key = os.environ["UJ_KEY"]
url = os.environ["UJ_URL"]
text = path.read_text(encoding="utf-8")
kv = {"UNCLEJON_CMS_URL": url, "UNCLEJON_CMS_API_KEY": key}
out=[]; seen=set()
for line in text.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k=line.split("=",1)[0].strip()
        if k in kv:
            out.append(f"{k}={kv[k]}"); seen.add(k); continue
    out.append(line)
for k,v in kv.items():
    if k not in seen: out.append(f"{k}={v}")
path.write_text("\n".join(out)+"\n", encoding="utf-8")
print("ENV_UPDATED")
PY
