#!/usr/bin/env python3
from pathlib import Path
import shutil
import datetime
import subprocess

ctrl = Path("/var/www/ctrlpanel")
stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
dst = ctrl / "app/Http/Controllers/ContactController.php"
shutil.copy2(dst, dst.with_suffix(dst.suffix + f".bak-{stamp}"))
shutil.copy2("/tmp/ContactController.php", dst)

envf = ctrl / ".env"
if envf.exists():
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
    envf.write_text("\n".join(out) + "\n")
    print("GRAPH_MAILBOX set")

# clear config cache if artisan exists
art = ctrl / "artisan"
if art.exists():
    subprocess.run(["php", "artisan", "config:clear"], cwd=ctrl, check=False)
    subprocess.run(["php", "artisan", "cache:clear"], cwd=ctrl, check=False)
print("unclejons contact controller deployed")
