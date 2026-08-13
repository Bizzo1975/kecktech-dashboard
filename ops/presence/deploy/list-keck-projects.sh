#!/bin/bash
set -euo pipefail
cd /opt/me-manager
while IFS= read -r line; do
  case "$line" in
    KECKTECH_CMS_URL=*|KECKTECH_CMS_API_KEY=*) export "$line" ;;
  esac
done < .env
curl -sS -H "Authorization: Bearer ${KECKTECH_CMS_API_KEY}" "${KECKTECH_CMS_URL%/}/api/me-manager/projects" > /tmp/keck-projects.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/keck-projects.json"))
items=d if isinstance(d,list) else d.get("projects") or d.get("items") or []
print("count", len(items))
for i in items:
    print(f"{i.get('slug')}\t{i.get('title')}\timg={bool(i.get('image'))}\tavail={i.get('available')}")
PY
