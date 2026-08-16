#!/bin/bash
# Proof gate — run on me-manager; prints redacted results only.
set -euo pipefail
cd /opt/me-manager
echo "ME_HEAD=$(git rev-parse HEAD)"
bash /tmp/four-site-probe.sh 2>/dev/null || true
# Coordinator health via local app (no auth if internal)
curl -sS -o /tmp/coord.json -w "coordinator_health_http=%{http_code}\n" http://127.0.0.1:3010/api/coordinator/health || true
python3 - <<'PY'
import json
from pathlib import Path
p=Path('/tmp/coord.json')
if p.exists() and p.stat().st_size:
  try:
    d=json.loads(p.read_text())
    tiles=d.get('sites') or d.get('tiles') or d
    if isinstance(tiles, list):
      for t in tiles:
        print('tile', t.get('siteKey') or t.get('site'), 'cms', t.get('cmsEnabled'), 'posts', t.get('posts'), 'projects', t.get('projects'), 'ok', t.get('ok') or t.get('bridgeOk'))
    elif isinstance(tiles, dict):
      print('keys', sorted(tiles.keys())[:20])
  except Exception as e:
    print('coord_parse', e)
PY
# Inbox teasers still awaiting
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U me_manager -d me_manager -t -A -c \
  "SELECT count(*) FROM \"ContentPackage\" WHERE status='awaiting_approval' AND (\"siteTargets\"::text ILIKE '%jacob%' OR title ILIKE '%quiet%' OR title ILIKE '%perspectives%' OR title ILIKE '%disposable%' OR title ILIKE '%know your%' OR title ILIKE '%yours, mine%');"
