#!/usr/bin/env python3
"""Audit Kecktech demos for duplicates on dashboard host."""
from __future__ import annotations

import json
import re
import urllib.request
from collections import Counter
from pathlib import Path

paths = [
    Path("/opt/docker/dashboard/website/src/data/demos.json"),
    Path("/opt/dashboard/website/src/data/demos.json"),
]
for p in paths:
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        apps = data.get("apps") or []
        print("FILE", p, "count", len(apps))
        ids = [a.get("id") for a in apps]
        names = [a.get("name") for a in apps]
        urls = [a.get("url") for a in apps]
        print("IDS", ids)
        print("DUP_IDS", [k for k, v in Counter(ids).items() if v > 1])
        print("DUP_NAMES", [k for k, v in Counter(names).items() if v > 1])
        print("DUP_URLS", [k for k, v in Counter(urls).items() if v > 1])
        for a in apps:
            print("APP", a.get("id"), "|", a.get("name"), "|", a.get("url"))

for url in [
    "http://127.0.0.1/demos",
    "http://kecktech-web/demos",
]:
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            html = r.read().decode("utf-8", "ignore")
        print("HTTP", url, "bytes", len(html))
        titles = re.findall(r"<h3[^>]*>([^<]+)</h3>", html, re.I)
        if not titles:
            titles = re.findall(r'class="demo-card__name"[^>]*>([^<]+)<', html, re.I)
        print("H3", titles)
        print("H3_DUP", [k for k, v in Counter(titles).items() if v > 1])
    except Exception as exc:  # noqa: BLE001
        print("HTTP_ERR", url, type(exc).__name__, exc)
