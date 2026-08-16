#!/usr/bin/env python3
"""Deploy Listmonk stack to /opt/docker/listmonk and patch WWFL newsletter subscribe."""
from pathlib import Path
import os
import secrets
import shutil
import subprocess
import sys

ROOT = Path("/opt/docker/listmonk")
ROOT.mkdir(parents=True, exist_ok=True)

db_pw = secrets.token_urlsafe(24)
admin_pw = secrets.token_urlsafe(16)

compose = Path("/tmp/listmonk-docker-compose.yml").read_text()
(ROOT / "docker-compose.yml").write_text(compose)

# config from example with real passwords
cfg = Path("/tmp/listmonk-config.toml.example").read_text()
cfg = cfg.replace('admin_password = "CHANGE_ME_ON_FIRST_LOGIN"', f'admin_password = "{admin_pw}"')
cfg = cfg.replace('password = "CHANGE_ME_DB"', f'password = "{db_pw}"')
(ROOT / "config.toml").write_text(cfg)
(ROOT / ".env").write_text(f"LISTMONK_DB_PASSWORD={db_pw}\n")

# Persist admin password for operator (not world-readable)
secrets_path = ROOT / "CREDENTIALS.txt"
secrets_path.write_text(
    f"listmonk admin user: admin\n"
    f"listmonk admin password: {admin_pw}\n"
    f"postgres password: {db_pw}\n"
    f"UI: http://10.20.0.203:9000\n"
)
os.chmod(secrets_path, 0o600)
os.chmod(ROOT / ".env", 0o600)
os.chmod(ROOT / "config.toml", 0o600)

r = subprocess.run(["docker", "compose", "up", "-d"], cwd=ROOT)
if r.returncode != 0:
    sys.exit(r.returncode)
print("listmonk_up")
print("credentials_file", str(secrets_path))
