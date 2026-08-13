#!/bin/bash
set -euo pipefail
KEY=$(python3 - <<'PY'
from pathlib import Path
import re
t = Path("/opt/me-manager/.env.production").read_text()
m = re.search(r"^UNCLEJON_CMS_API_KEY=(.*)$", t, re.M)
print((m.group(1).strip() if m else ""))
PY
)
test -n "$KEY"
curl -sS -m 10 -o /tmp/br.json -w "pub:%{http_code}\n" -H "Authorization: Bearer ${KEY}" \
  https://www.unclejonsitgarage.com/api/me-manager/posts
curl -sS -m 8 -o /tmp/br2.json -w "lan:%{http_code}\n" -H "Authorization: Bearer ${KEY}" \
  http://10.20.0.202:3006/api/me-manager/posts
head -c 120 /tmp/br2.json; echo
# Prefer LAN URL for ME Manager → UJ bridge reliability
python3 - <<'PY'
from pathlib import Path
path = Path("/opt/me-manager/.env.production")
text = path.read_text(encoding="utf-8")
out = []
for line in text.splitlines():
    if line.startswith("UNCLEJON_CMS_URL="):
        out.append("UNCLEJON_CMS_URL=http://10.20.0.202:3006")
    else:
        out.append(line)
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("URL_SET_LAN")
PY
cd /opt/me-manager
docker compose -f docker-compose.prod.yml --env-file .env.production ps
