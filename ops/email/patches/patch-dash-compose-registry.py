#!/usr/bin/env python3
from pathlib import Path
import re
import shutil
import datetime

p = Path("/opt/docker/dashboard/docker-compose.yml")
bak = p.with_suffix(p.suffix + f".bak-email-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}")
shutil.copy2(p, bak)
text = p.read_text()

# Isolate dashboard service block (until next top-level service key)
m = re.search(r"(?ms)^(  dashboard:\n)(.*?)(?=^  [a-z0-9-]+:|\Z)", text)
if not m:
    raise SystemExit("dashboard service not found")
head, body = m.group(1), m.group(2)

if "EMAIL_REGISTRY_PATH" not in body:
    if "environment:\n" in body:
        body = body.replace(
            "environment:\n",
            "environment:\n      - EMAIL_REGISTRY_PATH=/app/data/contacts-registry.json\n",
            1,
        )
    else:
        body = "    environment:\n      - EMAIL_REGISTRY_PATH=/app/data/contacts-registry.json\n" + body

if "./data:/app/data" not in body:
    # insert volumes before networks of this service
    if re.search(r"(?m)^    networks:\n", body):
        body = re.sub(
            r"(?m)^(    networks:\n)",
            "    volumes:\n      - ./data:/app/data\n\\1",
            body,
            count=1,
        )
    else:
        body += "    volumes:\n      - ./data:/app/data\n"

new = text[: m.start()] + head + body + text[m.end() :]
p.write_text(new)
print("patched", p)
print("backup", bak)
