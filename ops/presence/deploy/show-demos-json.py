#!/usr/bin/env python3
import json
from pathlib import Path
p = Path("/opt/docker/dashboard/website/src/data/demos.json")
d = json.loads(p.read_text())
apps = d.get("apps") or []
print("count", len(apps))
print([a.get("id") for a in apps])
