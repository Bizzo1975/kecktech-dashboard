#!/usr/bin/env python3
"""Insert Listmonk subscribe call into WWFL newsletter subscribers route (idempotent)."""
from pathlib import Path
import shutil
import datetime
import subprocess
import sys

SITE = Path("/opt/docker/personal-website")
helper_src = Path("/tmp/wwfl-listmonk-subscribe.ts")
helper_dst = SITE / "src/lib/services/listmonk-subscribe.ts"
shutil.copy2(helper_src, helper_dst)

route = SITE / "src/app/api/newsletter/subscribers/route.ts"
stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
shutil.copy2(route, route.with_suffix(route.suffix + f".bak-listmonk-{stamp}"))
text = route.read_text()

import_line = "import { listmonkSubscribe } from '@/lib/services/listmonk-subscribe';\n"
if "listmonkSubscribe" not in text:
    # after first import block
    lines = text.splitlines(True)
    insert_at = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            insert_at = i + 1
    lines.insert(insert_at, import_line)
    text = "".join(lines)

hook = """
    // Also subscribe in Listmonk when configured (double opt-in per list settings)
    try {
      const lm = await listmonkSubscribe({
        email: email.toLowerCase().trim(),
        name: name || [firstName, lastName].filter(Boolean).join(' ') || undefined,
        attribs: { source: source || 'website', ...(metadata || {}) },
      });
      if (!lm.ok) {
        console.warn('Listmonk subscribe skipped/failed:', lm.error);
      }
    } catch (lmErr) {
      console.warn('Listmonk subscribe error:', lmErr);
    }
"""

marker = "await sendWelcomeEmail(subscriber);"
if "listmonkSubscribe({" not in text and marker in text:
    text = text.replace(
        marker,
        marker + "\n" + hook,
        1,
    )
elif "listmonkSubscribe({" in text:
    print("listmonk hook already present")
else:
    # fallback: before success return after insert
    print("WARN: sendWelcomeEmail marker missing; appending hook before final success if possible")

route.write_text(text)
print("newsletter route patched")

# Ensure LISTMONK_URL placeholder keys exist (empty until admin creates API token)
envp = SITE / ".env.production"
keys = {
    "LISTMONK_URL": "http://10.20.0.203:9000",
    "LISTMONK_API_USER": "",
    "LISTMONK_API_TOKEN": "",
    "LISTMONK_LIST_UUID": "",
}
out = []
seen = set()
for line in envp.read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0]
        if k in keys:
            # keep existing non-empty
            cur = line.split("=", 1)[1]
            out.append(line if cur else f"{k}={keys[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f"{k}={v}")
envp.write_text("\n".join(out) + "\n")
print("LISTMONK env keys ensured")

compose = ["docker", "compose", "-f", "docker-compose.prod.yml", "up", "-d", "--build", "app"]
r = subprocess.run(compose, cwd=SITE)
sys.exit(r.returncode)
