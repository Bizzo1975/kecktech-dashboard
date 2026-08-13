#!/usr/bin/env python3
from pathlib import Path
import shutil
import datetime
import subprocess
import sys

api = Path("/opt/docker/dashboard/website/api")
if not api.exists():
    # try find
    cands = list(Path("/opt").glob("**/website/api/contact.php"))
    if not cands:
        print("contact.php not found")
        sys.exit(1)
    api = cands[0].parent

stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
for name in ("graph_mail.php", "contact.php"):
    dst = api / name
    if dst.exists():
        shutil.copy2(dst, dst.with_suffix(dst.suffix + f".bak-{stamp}"))
    shutil.copy2(f"/tmp/{name}", dst)
    print("deployed", dst)

# restart mailer/php container if compose present
root = api.parent.parent  # website -> dashboard
for compose in ("docker-compose.yml", "compose.yml"):
    if (root / compose).exists():
        subprocess.run(["docker", "compose", "-f", compose, "restart"], cwd=root, check=False)
        break
print("kecktech api updated")
