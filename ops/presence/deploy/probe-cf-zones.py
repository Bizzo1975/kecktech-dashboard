#!/usr/bin/env python3
"""Probe local env files for a CF token that can see unclejonsitgarage.com. Never print tokens."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

PATHS = [
    Path(r"F:/Github/me-manager/.env"),
    Path(r"F:/Github/me-manager/.env.production"),
    Path(r"F:/Github/kecktech-dashboard/.env"),
    Path(r"F:/Github/Dashboard/.env"),
    Path(r"F:/Github/Dashboard/docker/.env"),
]
KEYS = [
    "CF_TUNNEL_API_TOKEN",
    "CF_DNS_API_TOKEN",
    "CLOUDFLARE_API_TOKEN",
    "CF_API_TOKEN",
]


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def zones_for(tok: str) -> list[str]:
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/zones?per_page=50",
        headers={"Authorization": f"Bearer {tok}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return [z["name"] for z in (data.get("result") or [])]


def main() -> None:
    found = False
    for path in PATHS:
        env = load_env(path)
        for key in KEYS:
            tok = env.get(key) or ""
            if not tok:
                continue
            try:
                zones = zones_for(tok)
            except Exception as exc:  # noqa: BLE001
                print(f"{path.name} {key} ERR {type(exc).__name__}")
                continue
            print(f"{path.name} {key} zones={zones}")
            if "unclejonsitgarage.com" in zones:
                print(f"MATCH {path} {key}")
                found = True
    if not found:
        print("NO_MATCH")


if __name__ == "__main__":
    main()
