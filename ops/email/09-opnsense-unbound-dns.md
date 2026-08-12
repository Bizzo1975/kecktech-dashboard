# Mgmt DNS architecture (AdGuard Home + Unbound)

## Correct design

```text
Clients (Office-PC 10.10.0.100)
  -> DNS 10.10.0.1 (OPNsense Unbound on :53)
    -> forward to 127.0.0.1:5353 (AdGuard Home DNS)
      -> AdGuard filtering + upstream resolvers
      -> AdGuard UI http://10.10.0.1:3000/
```

- **AdGuard IS the DNS design.** Unbound must forward to `127.0.0.1:5353` only (not public resolvers as permanent).
- **Do not** treat `127.0.0.1:5353` as "Mailcow" — that port is **AdGuard Home**.
- Temporary PC DNS `8.8.8.8` / `1.1.1.1` is only an emergency workaround while AdGuard is down.
- AdGuard DNS must stay on **port 5353** (never 53 — Unbound owns 53). YAML backup: `AdGuardHome.yaml.bak-fixbind`.

## Failure mode we hit

1. AdGuard Home process/UI on `:3000` was **down**.
2. Unbound still forwarded to `127.0.0.1:5353` → **SERVFAIL** for clients using `10.10.0.1`.
3. A bad workaround replaced AdGuard with public Unbound forwarders. That restored browse but **skipped AdGuard**.

## AdGuard DNS rewrites (restored 2026-08-11)

Live file: `/usr/local/AdGuardHome/AdGuardHome.yaml`  
Backup before restore: `AdGuardHome.yaml.bak-before-rewrites-*`

| Domain | Answer |
|--------|--------|
| `*.kecktech.net` | `10.20.0.100` (Traefik) |
| `kecktech.net` | `10.20.0.100` |
| `*.willworkforlunch.com` | `10.20.0.100` |
| `willworkforlunch.com` / `www` / `dev` | `10.20.0.100` |
| `jacob-roman.com` / `www.jacob-roman.com` | `10.20.0.100` |
| `pve-prod-01.internal.kecktech.net` | `10.10.0.11` |
| `pve-dev-01.internal.kecktech.net` | `10.10.0.12` |
| `ns-01.internal.kecktech.net` | `10.10.0.1` |

Unbound **private-domain** must include `kecktech.net`, `willworkforlunch.com`, `jacob-roman.com` so RFC1918 rewrite answers are not stripped.

Public Cloudflare records are unchanged for websites — these are LAN split-horizon only. No AdGuard rewrite for unclejons (Cloudflare Tunnel).

Do **not** point app hostnames at backend VMs; always Traefik `10.20.0.100`.

## Current confirmed state (2026-08-11)

| Piece | State |
|-------|--------|
| AdGuard Home | Running; DNS `127.0.0.1:5353`; UI `*:3000` → `http://10.10.0.1:3000/` |
| Unbound | Listening `*:53`; Query Forwarding **only** `127.0.0.1@5353` (persisted in `/conf/config.xml`) |
| Config backup | `/conf/config.xml.bak-adguard-forward` |
| AdGuard YAML backup | `/usr/local/AdGuardHome/AdGuardHome.yaml.bak-fixbind` |
| Office-PC | `10.10.0.100` / gw `10.10.0.1` — may still be on temporary DNS until elevated set |

**Persistence note:** editing `/usr/local/etc/unbound.opnsense.d/dot.conf` alone is overwritten on Unbound restart. Change **Query Forwarding in the UI** (or `/conf/config.xml` `<unboundplus><dots>`) then `configctl template reload OPNsense/Unboundplus` + restart Unbound.

## Recovery checklist

1. Keep Office-PC on temporary DNS `8.8.8.8` + `1.1.1.1` until AdGuard is healthy.
2. On OPNsense host, start AdGuard Home so:
   - `http://10.10.0.1:3000/` loads
   - DNS answers on `127.0.0.1:5353`
3. **Services → Unbound DNS → Query Forwarding**
   - Remove `1.1.1.1` / `8.8.8.8` if present
   - Forwarder: blank domain → `127.0.0.1` port `5353` (description: AdGuard Home)
   - Apply
4. Verify: `nslookup google.com 10.10.0.1` and AdGuard UI `:3000`
5. Set Office-PC DNS back to `10.10.0.1` (elevated PowerShell / admin):

```powershell
Set-DnsClientServerAddress -InterfaceAlias 'Ethernet' -ServerAddresses '10.10.0.1'
Clear-DnsClientCache
nslookup google.com
```

## Shell checks (on OPNsense)

```sh
sockstat -l | grep -E '3000|5353|AdGuard|unbound'
ps aux | grep -i '[A]dGuard'
cat /usr/local/etc/unbound.opnsense.d/dot.conf
pluginctl -s adguardhome start
sysrc adguardhome_enable=YES
```

## Safety

- Tailscale on Office-PC: keep **stopped** or at least `accept-routes=false`, `accept-dns=false` while on mgmt LAN.
- Do **not** enable Tailscale `RouteAll` / accept Proxmox `10.10.0.0/24` routes on-site (blackholes mgmt).
- Do not start Mailcow for DNS.
- Do not put AdGuard on port 53 (Unbound owns `:53`).
