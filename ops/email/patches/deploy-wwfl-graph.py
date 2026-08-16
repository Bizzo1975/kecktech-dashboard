#!/usr/bin/env python3
from pathlib import Path
import shutil
import datetime
import subprocess
import sys

SITE = Path("/opt/docker/personal-website")
stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
route = SITE / "src/app/api/contact/route.ts"
shutil.copy2(route, route.with_suffix(route.suffix + f".bak-{stamp}"))
shutil.copy2("/tmp/graph-mail.ts", SITE / "src/lib/services/graph-mail.ts")
shutil.copy2("/tmp/wwfl-contact-route.ts", route)

envp = SITE / ".env.production"
frag = Path("/tmp/graph-mailer.env.fragment")
keys = {}
for line in frag.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    if k.startswith("GRAPH_"):
        keys[k] = v
keys["GRAPH_MAILBOX"] = "support@kecktech.net"
keys["GRAPH_FROM"] = "hello@willworkforlunch.com"
keys["FROM_EMAIL"] = "hello@willworkforlunch.com"
keys["ADMIN_EMAIL"] = "hello@willworkforlunch.com"

out = []
seen = set()
for line in envp.read_text().splitlines():
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
envp.write_text("\n".join(out) + "\n")
print("env_keys_updated", ",".join(sorted(keys)))

frag.unlink(missing_ok=True)
Path("/tmp/graph-mail.ts").unlink(missing_ok=True)
Path("/tmp/wwfl-contact-route.ts").unlink(missing_ok=True)

compose = ["docker", "compose", "-f", "docker-compose.prod.yml", "up", "-d", "--build", "app"]
if not (SITE / "docker-compose.prod.yml").exists():
    compose = ["docker", "compose", "up", "-d", "--build", "app"]
r = subprocess.run(compose, cwd=SITE)
sys.exit(r.returncode)
