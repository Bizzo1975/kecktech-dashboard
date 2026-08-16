#!/usr/bin/env python3
"""Upsert marketing allowlist into Kecktech CMS projects. Run on me-manager."""
import json
import urllib.request
from pathlib import Path

APPS = [
    ("Marketlist", "marketlist", "https://marketlist.kecktech.net", "marketlist@kecktech.net"),
    ("FloorOS", "flooros", "https://flooros.kecktech.net/login", "flooros@kecktech.net"),
    ("Customer Portal", "portal", "https://portal.kecktech.net", "portal@kecktech.net"),
    ("FarmBot", "farmbot", "https://farmbot.kecktech.net", "farmbot@kecktech.net"),
    ("Cleaner", "cleaner", "https://cleaner.kecktech.net", "cleaner@kecktech.net"),
    ("Argo", "argo", "https://argo.kecktech.net", "argo@kecktech.net"),
    ("NetOps", "netops", "https://net-ops.kecktech.net", "netops@kecktech.net"),
    ("Chat", "chat", "https://chat.kecktech.net", "chat@kecktech.net"),
    ("Sovereign Hub", "sovereign-hub", "https://sovereign-hub.kecktech.net", "hub@kecktech.net"),
    ("AeroCAD", "aerocad", "https://aerocad.kecktech.net", "aerocad@kecktech.net"),
]


def load_key():
    url = key = None
    for f in (Path("/opt/me-manager/.env"), Path("/opt/me-manager/.env.production")):
        if not f.exists():
            continue
        for line in f.read_text().splitlines():
            if line.startswith("KECKTECH_CMS_URL="):
                url = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("KECKTECH_CMS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    return url, key


url, key = load_key()
print("CMS", url)

req = urllib.request.Request(
    f"{url.rstrip('/')}/api/me-manager/projects",
    headers={"Authorization": f"Bearer {key}"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode())
items = data if isinstance(data, list) else data.get("projects") or data.get("items") or []
by_slug = {i.get("slug"): i for i in items}
print("existing", sorted(by_slug))

for title, slug, live, email in APPS:
    body = {
        "title": title,
        "slug": slug,
        "description": title,
        "live_demo": live,
        "contact_email": email,
        "available": True,
        "featured": True,
        "status": "published",
        "technologies": [],
        "image": f"/images/demos/{slug}.jpg",
    }
    payload = json.dumps(body).encode()
    existing = by_slug.get(slug)
    if existing and existing.get("id"):
        r = urllib.request.Request(
            f"{url.rstrip('/')}/api/me-manager/projects/{existing['id']}",
            data=payload,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="PATCH",
        )
        action = "PATCH"
    else:
        r = urllib.request.Request(
            f"{url.rstrip('/')}/api/me-manager/projects",
            data=payload,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        action = "POST"
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            print(action, slug, resp.status)
    except Exception as e:
        print(action, slug, "ERR", e)

ALIASES = {"net-ops", "kecktech-portal", "chat-kecktech", "sovereign", "syll"}
for slug, item in list(by_slug.items()):
    if slug in ALIASES and item.get("id"):
        r = urllib.request.Request(
            f"{url.rstrip('/')}/api/me-manager/projects/{item['id']}",
            headers={"Authorization": f"Bearer {key}"},
            method="DELETE",
        )
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                print("DELETE", slug, resp.status)
        except Exception as e:
            print("DELETE", slug, "ERR", e)
