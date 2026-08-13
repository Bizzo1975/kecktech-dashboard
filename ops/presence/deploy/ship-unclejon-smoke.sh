#!/bin/bash
# Ship unclejon smoke via local ME nginx (avoid CF timeout). Never prints key.
set -euo pipefail
KEY=$(python3 - <<'PY'
from pathlib import Path
import re
t=Path('/opt/me-manager/.env.production').read_text()
m=re.search(r'^ME_MANAGER_INGEST_KEY=(.*)$', t, re.M)
print(m.group(1).strip().strip('"').strip("'") if m else '')
PY
)
test -n "$KEY"
payload='{"title":"Uncle Jon bridge smoke","summary":"Presence closeout smoke — Inbox draft only","content":"Marketing + ME bridge cutover smoke test. Approve or reject in Inbox.","source":"manual","sourceRef":"uj-bridge-smoke-2026-08-12b","userFacing":true,"targets":{"site":"unclejon","social":false}}'
code=$(curl -sS -m 120 -o /tmp/uj-ship.json -w '%{http_code}' \
  -H "Authorization: Bearer ${KEY}" -H 'Content-Type: application/json' \
  -d "$payload" http://127.0.0.1/api/events/ship)
echo "SHIP_HTTP $code"
python3 - <<'PY'
import json
from pathlib import Path
raw=Path('/tmp/uj-ship.json').read_text()
print(raw[:400])
try:
  data=json.loads(raw)
  print('packageId', data.get('packageId'))
  print('status', data.get('status'))
except Exception as e:
  print('parse_err', e)
PY
