#!/usr/bin/env python3
from pathlib import Path
p = Path("/opt/docker/personal-website/.env.production")
keys = {"LISTMONK_LIST_ID": "3"}
out, seen = [], set()
for line in p.read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0]
        if k in keys:
            out.append(f"{k}={keys[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("list_id_set")
