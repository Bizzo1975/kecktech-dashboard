#!/bin/bash
# Make showcase demos publicly reachable at Traefik+Authelia layer.
set -euo pipefail
TS=$(date +%Y%m%d%H%M%S)
AUTH=/opt/docker/authelia/configuration.yml
DYN=/opt/docker/traefik/dynamic

cp -a "$AUTH" "$AUTH.bak.demo-access.$TS"

python3 - <<'PY'
from pathlib import Path
p = Path("/opt/docker/authelia/configuration.yml")
text = p.read_text()
# Ensure all demo hosts are in the public bypass block
needle = """        # Demo showcase apps (kecktech.net/demos) — anonymous viewable
        - \"cleaner.kecktech.net\"
        - \"argo.kecktech.net\"
        - \"net-ops.kecktech.net\"
        - \"chat.kecktech.net\"
        - \"sovereign-hub.kecktech.net\""""
replacement = """        # Demo showcase apps (kecktech.net/demos) — anonymous viewable
        - \"cleaner.kecktech.net\"
        - \"argo.kecktech.net\"
        - \"net-ops.kecktech.net\"
        - \"chat.kecktech.net\"
        - \"sovereign-hub.kecktech.net\"
        - \"sovereign.kecktech.net\"
        - \"flooros.kecktech.net\"
        - \"farmbot.kecktech.net\"
        - \"marketlist.kecktech.net\"
        - \"portal.kecktech.net\""""
if "Demo showcase apps" in text and "portal.kecktech.net\"\n        - \"auth.kecktech.net\"" not in text.replace(" ",""):
    if needle in text:
        text = text.replace(needle, replacement)
    else:
        print("WARN: demo showcase block not found exactly; check manually")
# Soften portal-specific deny rules: comment them out so public bypass wins
# (bypass rule is earlier in file for portal now - but portal deny rules come AFTER public bypass
# and Authelia uses FIRST matching rule. Public bypass already lists domains before portal deny.
# Adding portal to bypass list above is enough IF it matches first.)
p.write_text(text)
print("authelia_updated")
# show demo block
for i,line in enumerate(text.splitlines(),1):
    if "Demo showcase" in line or (i>90 and i<120 and "kecktech.net" in line and "policy" not in line):
        if 90 <= i <= 125:
            print(f"{i}:{line}")
PY

# Remove Authelia middleware from Traefik demo routers (Authelia bypass already set;
# removing middleware avoids forward-auth roundtrip and accidental lockouts).
for f in argo.yml cleaner.yml openwebui.yml portal.yml; do
  cp -a "$DYN/$f" "$DYN/$f.bak.demo-access.$TS"
done
cp -a "$DYN/sovereign.yml" "$DYN/sovereign.yml.bak.demo-access.$TS"

python3 - <<'PY'
from pathlib import Path
import re
dyn = Path("/opt/docker/traefik/dynamic")

def strip_authelia(path: Path):
    t = path.read_text()
    orig = t
    # Remove middleware blocks that only reference authelia@docker
    t = re.sub(
        r"(?m)^(\s*)middlewares:\n(?:\1  - authelia@docker\n)+",
        "",
        t,
    )
    # Also handle inline list form
    t = re.sub(r"(?m)^\s*- authelia@docker\s*\n", "", t)
    # Clean empty middlewares: keys left empty
    t = re.sub(r"(?m)^(\s*)middlewares:\s*\n(?=\1\S|\Z)", "", t)
    if t != orig:
        path.write_text(t)
        print(f"stripped_authelia {path.name}")
    else:
        print(f"no_change {path.name}")

for name in ["argo.yml", "cleaner.yml", "openwebui.yml", "portal.yml", "sovereign.yml"]:
    strip_authelia(dyn / name)
PY

# Restart Authelia to pick up config
if docker ps --format '{{.Names}}' | grep -qx authelia; then
  docker restart authelia
  echo "authelia_restarted"
elif docker ps --format '{{.Names}}' | grep -qi authelia; then
  NAME=$(docker ps --format '{{.Names}}' | grep -i authelia | head -1)
  docker restart "$NAME"
  echo "restarted $NAME"
else
  echo "WARN: authelia container not found on this host"
  docker ps --format '{{.Names}}' | head -30
fi

echo DONE_TRAEFIK_AUTHELIA
