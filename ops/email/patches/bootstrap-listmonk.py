#!/usr/bin/env python3
"""Bootstrap Listmonk admin user (first-time) + WWFL list; write LISTMONK_* for WWFL."""
import json
import re
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

BASE = "http://127.0.0.1:9000"
creds = Path("/opt/docker/listmonk/CREDENTIALS.txt").read_text()
m = re.search(r"listmonk admin password:\s*(\S+)", creds)
admin_pass = m.group(1) if m else "ChangeMeNow!"
admin_user = "admin"
admin_email = "hello@willworkforlunch.com"

def req(method, path, data=None, auth=None, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    body = None if data is None else json.dumps(data).encode()
    r = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
    if auth:
        import base64
        token = base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        r.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw) if raw else {"raw": raw}
        except Exception:
            return e.code, {"raw": raw}

# First-time user creation endpoint used by setup UI (listmonk v3+/v4+)
# Try common endpoints
status, body = req("GET", "/api/config")
print("config", status, list(body.keys()) if isinstance(body, dict) else body)

created = False
for path, payload in [
    ("/api/users", {
        "username": admin_user,
        "password": admin_pass,
        "email": admin_email,
        "name": "WWFL Admin",
        "type": "superadmin",
        "status": "enabled",
    }),
    ("/admin/api/users", {
        "username": admin_user,
        "password": admin_pass,
        "email": admin_email,
        "name": "WWFL Admin",
        "type": "superadmin",
        "status": "enabled",
    }),
]:
    st, b = req("POST", path, payload)
    print("try", path, st, b)
    if st in (200, 201):
        created = True
        break

if not created:
    # Fallback: open setup — some versions use /api/install or session form
    st, b = req("POST", "/api/install", {
        "user": {
            "username": admin_user,
            "password": admin_pass,
            "email": admin_email,
            "name": "WWFL Admin",
        }
    })
    print("install", st, b)
    created = st in (200, 201)

auth = (admin_user, admin_pass)
st, lists = req("GET", "/api/lists", auth=auth)
print("lists", st, lists if st >= 400 else "ok")

list_uuid = None
list_id = None
if st == 200:
    items = (lists.get("data") or {}).get("results") or lists.get("data") or []
    if isinstance(items, dict):
        items = items.get("results") or []
    for it in items:
        if it.get("name") == "WWFL Newsletter":
            list_uuid = it.get("uuid")
            list_id = it.get("id")
            break

if not list_uuid:
    st, created_list = req("POST", "/api/lists", {
        "name": "WWFL Newsletter",
        "type": "public",
        "optin": "double",
        "tags": ["wwfl"],
    }, auth=auth)
    print("create_list", st, created_list)
    data = created_list.get("data") or {}
    list_uuid = data.get("uuid")
    list_id = data.get("id")

print("LIST_UUID", list_uuid)
print("LIST_ID", list_id)

# Persist API user note — Listmonk v6 prefers API tokens from UI.
# For now use basic auth with admin until token is created.
envp = Path("/opt/docker/personal-website/.env.production")
keys = {
    "LISTMONK_URL": "http://10.20.0.203:9000",
    "LISTMONK_API_USER": admin_user,
    "LISTMONK_API_TOKEN": admin_pass,
    "LISTMONK_LIST_UUID": str(list_uuid or ""),
    "LISTMONK_LIST_ID": str(list_id or ""),
}
out, seen = [], set()
for line in envp.read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0]
        if k in keys:
            out.append(f"{k}={keys[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f"{k}={v}")
envp.write_text("\n".join(out) + "\n")
print("wwfl env listmonk keys set")

# Append to credentials (operator)
with open("/opt/docker/listmonk/CREDENTIALS.txt", "a") as f:
    f.write(f"\nlist_uuid: {list_uuid}\nlist_id: {list_id}\n")
    f.write("SMTP: configure in Listmonk UI → Settings → SMTP as hello@willworkforlunch.com (M365)\n")
    f.write("Reply-To: hello@willworkforlunch.com\n")

print("bootstrap_done")
