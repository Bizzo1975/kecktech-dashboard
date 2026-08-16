#!/usr/bin/env python3
"""Ensure unclejons apex/www/panel hostnames on shared CF tunnel + DNS."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

env: dict[str, str] = {}
for line in Path("/opt/docker/.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

# DNS token can list/edit unclejons zone; tunnel token may lack Zone:Read.
dns_tok = env.get("CF_DNS_API_TOKEN") or ""
tun_tok = env.get("CF_TUNNEL_API_TOKEN") or dns_tok
if not dns_tok and not tun_tok:
    raise SystemExit("no CF token")

TUNNEL_ID = "f27a9fb9-7316-4bd9-a271-90982e0271c6"
ZONE = "unclejonsitgarage.com"
HOSTS = [
    "unclejonsitgarage.com",
    "www.unclejonsitgarage.com",
    "panel.unclejonsitgarage.com",
]
CNAME = f"{TUNNEL_ID}.cfargotunnel.com"


def cf(method: str, path: str, body: dict | None = None, *, token: str | None = None) -> dict:
    use = token or dns_tok or tun_tok
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {use}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def main() -> None:
    z = cf("GET", f"/zones?name={ZONE}", token=dns_tok)["result"][0]
    zid = z["id"]
    acct = z["account"]["id"]
    for name in HOSTS:
        recs = cf(
            "GET",
            f"/zones/{zid}/dns_records?name={name}",
            token=dns_tok,
        ).get("result") or []
        payload = {
            "type": "CNAME",
            "name": name,
            "content": CNAME,
            "proxied": True,
            "ttl": 1,
        }
        cname = [r for r in recs if r.get("type") == "CNAME"]
        others = [r for r in recs if r.get("type") in ("A", "AAAA")]
        # Prefer a single proxied CNAME to the shared tunnel.
        for r in others:
            cf("DELETE", f"/zones/{zid}/dns_records/{r['id']}", token=dns_tok)
            print("DNS_DEL", r.get("type"), name)
        if cname:
            cf("PUT", f"/zones/{zid}/dns_records/{cname[0]['id']}", payload, token=dns_tok)
            print("DNS_UPD", name)
        else:
            cf("POST", f"/zones/{zid}/dns_records", payload, token=dns_tok)
            print("DNS_NEW", name)

    # Tunnel token may manage remote config; local cloudflared.yml is also updated by ops.
    try:
        cfg = cf(
            "GET",
            f"/accounts/{acct}/cfd_tunnel/{TUNNEL_ID}/configurations",
            token=tun_tok or dns_tok,
        )["result"]["config"]
    except Exception as exc:  # noqa: BLE001
        print("TUNNEL_API_SKIP", type(exc).__name__, exc)
        return

    ingress = list(cfg.get("ingress") or [])
    hosts = {r.get("hostname") for r in ingress if isinstance(r, dict)}
    rules = [
        r
        for r in ingress
        if not (
            isinstance(r, dict)
            and not r.get("hostname")
            and str(r.get("service", "")).startswith("http_status")
        )
    ]
    catchall = next(
        (
            r
            for r in ingress
            if isinstance(r, dict)
            and not r.get("hostname")
            and str(r.get("service", "")).startswith("http_status")
        ),
        {"service": "http_status:404"},
    )
    added = 0
    for h in HOSTS:
        if h in hosts:
            print("TUNNEL_HAVE", h)
            continue
        rules.append(
            {
                "hostname": h,
                "service": "https://localhost:443",
                "originRequest": {"noTLSVerify": True},
            }
        )
        added += 1
        print("TUNNEL_ADD", h)
    if added:
        out = cf(
            "PUT",
            f"/accounts/{acct}/cfd_tunnel/{TUNNEL_ID}/configurations",
            {
                "config": {
                    **{k: v for k, v in cfg.items() if k != "ingress"},
                    "ingress": rules + [catchall],
                }
            },
            token=tun_tok or dns_tok,
        )
        print("TUNNEL_PUT", out.get("success"))
    else:
        print("TUNNEL_UNCHANGED")


if __name__ == "__main__":
    main()
