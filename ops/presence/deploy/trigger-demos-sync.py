#!/usr/bin/env python3
"""Trigger CMS demos sync by PATCHing aerocad; print demos.json apps after."""
import json
import urllib.request
from pathlib import Path

url = key = None
for f in (Path("/opt/me-manager/.env"), Path("/opt/me-manager/.env.production")):
    if not f.exists():
        continue
    for line in f.read_text().splitlines():
        if line.startswith("KECKTECH_CMS_URL="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
        if line.startswith("KECKTECH_CMS_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")

req = urllib.request.Request(
    f"{url.rstrip('/')}/api/me-manager/projects",
    headers={"Authorization": f"Bearer {key}"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode())
items = data if isinstance(data, list) else data.get("projects") or []
by = {i["slug"]: i for i in items}
print("cms_slugs", sorted(by))
aero = by["aerocad"]
body = json.dumps({"title": aero.get("title") or "AeroCAD", "available": True}).encode()
r = urllib.request.Request(
    f"{url.rstrip('/')}/api/me-manager/projects/{aero['id']}",
    data=body,
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    method="PATCH",
)
with urllib.request.urlopen(r, timeout=60) as resp:
    print("PATCH aerocad", resp.status)
