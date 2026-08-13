#!/usr/bin/env python3
import subprocess
from pathlib import Path

env = {}
for line in Path("/opt/me-manager/.env").read_text(encoding="utf-8", errors="ignore").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
# Prefer compose-injected values via printenv in container; fall back.
user = "me_manager"
db = "me_manager"

queries = [
    'SELECT id, title, "liveUrl", stage, "displaySites" FROM "PortfolioItem" WHERE \'kecktech\' = ANY("displaySites") ORDER BY lower(title);',
    'SELECT "liveUrl", count(*) AS n, string_agg(title, \' | \') AS titles FROM "PortfolioItem" WHERE coalesce("liveUrl",\'\') <> \'\' GROUP BY "liveUrl" HAVING count(*) > 1 ORDER BY n DESC;',
    'SELECT lower(title) AS t, count(*) AS n FROM "PortfolioItem" GROUP BY lower(title) HAVING count(*) > 1 ORDER BY n DESC LIMIT 30;',
]
for q in queries:
    print("====")
    print(q[:80])
    subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            "docker-compose.prod.yml",
            "--env-file",
            ".env.production",
            "exec",
            "-T",
            "postgres",
            "psql",
            "-U",
            user,
            "-d",
            db,
            "-c",
            q,
        ],
        cwd="/opt/me-manager",
        check=False,
    )
