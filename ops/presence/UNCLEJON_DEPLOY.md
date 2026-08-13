# Uncle Jon — live site & panel (post-cutover)

Live marketing: **https://www.unclejonsitgarage.com** (apex same).  
CtrlPanel: **https://panel.unclejonsitgarage.com**

Host: Proxmox VM **401** `unclejonsitgarage-01` (`10.20.0.202` / Tailscale `100.107.11.11`).  
Marketing Docker Compose: `/opt/unclejons-itgarage-site` on host port **3006**. CtrlPanel remains host nginx **:80**.

Traefik (`prod-traefik-01`) + shared Cloudflare tunnel route hostnames; `panel.` CNAME uses the same tunnel as www/apex.

## ME Manager bridge

- `siteKey`: **`unclejon`** (never `uncle-jons`)
- Site env: `ME_MANAGER_API_KEY` / ingest keys
- ME host: `UNCLEJON_CMS_URL` (LAN `http://10.20.0.202:3006` preferred) + `UNCLEJON_CMS_API_KEY`
- Property `cmsEnabled: true` after `GET /api/me-manager/posts` → 200

## Daily content (not setup)

1. Approve `unclejon` Inbox drafts in ME Manager  
2. Ship game progress with `targets.site: unclejon`  
3. Update Discord invite / Twisted Tavern Roblox URL in site env when ready  

## Smoke

```http
POST https://me.willworkforlunch.com/api/events/ship
Authorization: Bearer <INGEST_KEY>

{ "title": "UJ smoke", "summary": "Bridge test", "targets": { "site": "unclejon" }, "userFacing": true }
```

Expect Inbox draft tagged `unclejon`.
