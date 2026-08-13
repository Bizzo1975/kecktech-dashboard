#!/usr/bin/env python3
"""Probe CF token zones + remote tunnel ingress. Run on traefik host."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

env: dict[str, str] = {}
for line in Path("/opt/docker/.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

tok = env.get("CF_TUNNEL_API_TOKEN") or env.get("CF_DNS_API_TOKEN")
if not tok:
    raise SystemExit("no CF token")

TUNNEL_ID = "f27a9fb9-7316-4bd9-a271-90982e0271c6"


def cf(path: str) -> dict:
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        headers={"Authorization": f"Bearer {tok}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def main() -> None:
    zones = cf("/zones?per_page=50").get("result") or []
    print("ZONES", [z["name"] for z in zones])
    if not zones:
        raise SystemExit("no zones")
    acct = zones[0]["account"]["id"]
    print("ACCOUNT", acct)
    cfg = cf(f"/accounts/{acct}/cfd_tunnel/{TUNNEL_ID}/configurations")
    ingress = ((cfg.get("result") or {}).get("config") or {}).get("ingress") or []
    for row in ingress:
        if isinstance(row, dict):
            print("INGRESS", row.get("hostname"), "->", row.get("service"))


if __name__ == "__main__":
    main()
