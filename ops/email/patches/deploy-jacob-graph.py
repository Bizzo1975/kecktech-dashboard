#!/usr/bin/env python3
from pathlib import Path
import shutil
import datetime
import subprocess
import sys

SITE = Path("/opt/jacob-roman-blog")
stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
route = SITE / "app/api/contact/route.ts"
shutil.copy2(route, route.with_suffix(route.suffix + f".bak-{stamp}"))
shutil.copy2("/tmp/jacob-contact-route.ts", route)

# Ensure GRAPH_MAILBOX points at shared mailbox for send path
for envf in [SITE / "run.env", SITE / ".env"]:
    if not envf.exists():
        continue
    lines = envf.read_text().splitlines()
    out = []
    seen = False
    for line in lines:
        if line.startswith("GRAPH_MAILBOX="):
            out.append("GRAPH_MAILBOX=support@kecktech.net")
            seen = True
        else:
            out.append(line)
    if not seen:
        out.append("GRAPH_MAILBOX=support@kecktech.net")
    if not any(l.startswith("GRAPH_MAILBOX_JACOB=") for l in out):
        out.append("GRAPH_MAILBOX_JACOB=hello@jacob-roman.com")
    envf.write_text("\n".join(out) + "\n")
    print("updated", envf.name)

# Restart: prefer compose, else systemd, else hint
if (SITE / "docker-compose.yml").exists() or (SITE / "docker-compose.prod.yml").exists():
    f = "docker-compose.prod.yml" if (SITE / "docker-compose.prod.yml").exists() else "docker-compose.yml"
    r = subprocess.run(["sudo", "docker", "compose", "-f", f, "up", "-d", "--build"], cwd=SITE)
    sys.exit(r.returncode)

r = subprocess.run(["sudo", "systemctl", "restart", "jacob-roman-blog"], capture_output=True, text=True)
if r.returncode == 0:
    print("restarted jacob-roman-blog")
    sys.exit(0)
# Fallback: touch and hope next rebuild, or kill next
print("no compose/systemd; copying only — check process manager")
sys.exit(0)
