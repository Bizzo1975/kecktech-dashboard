# FarmBot self-host (Kecktech)

Self-host the official open-source **FarmBot Web App** as Marketlist’s FarmBot **REST + MQTT backend** (and break-glass map/sequence authoring). Marketlist owns day-to-day robot UX natively (status, e-stop, sequences run, plants, harvest → pantry) via encrypted API tokens — not an iframe/WebView primary path.

## Architecture

- **Guest:** `prod-farmbot-01` (Ubuntu 24.04) — `10.20.0.145` (VLAN 20)
- **App path:** `/opt/farmbot/Farmbot-Web-App`
- **Public host:** `https://farmbot.kecktech.net` (root of host — required by FarmBot `API_HOST` / JWT `iss`)
- **Edge:** Traefik on `prod-traefik-01` — see [`deploy/traefik/farmbot.yml`](../deploy/traefik/farmbot.yml)
- **Marketlist shell:** Garden → **Open robot controls** → native `/app/garden/farmbot` (web) or `garden-farmbot` (mobile). Advanced authoring (Farm Designer / Sequence Editor) is a secondary link to `FARMBOT_PUBLIC_URL`.

| Port | Use |
|------|-----|
| 443 (HTTPS) | FarmBot Web UI + REST API (Traefik → guest `:3000`) |
| 8883 | MQTT TLS (FarmBot OS devices + Marketlist broker/control) |
| 3002 | MQTT over WebSockets (optional FarmBot SPA live controls) |

```text
User → Marketlist (marketlist.kecktech.net)
         ├─ Garden food loop → API → FarmBot REST (token)
         └─ Robot controls → API → FarmBot REST + MQTT RPC (token)
Device → farmbot.kecktech.net :443 / :8883
Advanced authoring (break-glass) → farmbot.kecktech.net (FarmBot SPA)
```

## Guest sizing

| Spec | Value |
|------|--------|
| vCPU | 4 |
| RAM | 8 GB |
| Disk | 60 GB+ |
| Role | FarmBot only (Postgres + Redis + RabbitMQ in Compose) |

## Install (official path)

```bash
sudo mkdir -p /opt/farmbot
cd /opt/farmbot
sudo git clone https://github.com/FarmBot/Farmbot-Web-App --depth=5 --branch=main
cd Farmbot-Web-App
sudo cp example.env .env
# Edit .env — see required table below
sudo docker compose build web
sudo docker compose run web gem install bundler
sudo docker compose run web bundle install
sudo docker compose run web bun install
sudo docker compose run web bundle exec rails db:create db:migrate
sudo docker compose up -d
```

Wait until assets finish building before first login.

## Required `.env`

| Var | Value |
|-----|--------|
| `API_HOST` | `farmbot.kecktech.net` |
| `API_PORT` | `3000` |
| `MQTT_HOST` | `farmbot.kecktech.net` |
| `POSTGRES_PASSWORD` | strong secret |
| `DEVISE_SECRET` | `openssl rand -hex 64` |
| `ADMIN_PASSWORD` | strong secret |
| `SECRET_KEY_BASE` | `openssl rand -hex 64` |
| `RAILS_ENV` | `production` |
| `NO_EMAILS` | `TRUE` |
| `FORCE_SSL` | `TRUE` |
| `MQTT_WS` | `wss://farmbot.kecktech.net:3002/ws` (confirm against broker) |

Delete Heroku / GCS / CloudAMQP example lines. Do **not** leave the sample `RSA_KEY=` text — delete that line so keys auto-generate.

## CSP patch (optional — advanced authoring only)

FarmBot sets CSP `frame_ancestors` to `'self'` + farm.bot + Shopify only. Marketlist **does not** embed FarmBot as primary UX anymore, so iframe CSP is **not required** for product control.

If you still want to frame FarmBot for experiments, apply the historical patch below.

On the guest, after clone (and after each `git pull` upgrade), patch SecureHeaders in `config/application.rb`:

```bash
cd /opt/farmbot/Farmbot-Web-App
sudo cp config/application.rb config/application.rb.bak.$(date +%Y%m%d)
# Ensure frame_ancestors includes Marketlist (exact line varies by FarmBot version):
sudo grep -n frame_ancestors config/application.rb
```

Change `frame_ancestors` to include Marketlist, for example:

```ruby
frame_ancestors: %w('self' https://marketlist.kecktech.net https://farm.bot https://*.shopify.com https://*.shopifypreview.com),
```

Then rebuild/restart the web container so the change is baked into the image or mounted config:

```bash
sudo docker compose restart web
# If application.rb is baked at image build time:
sudo docker compose build web
sudo docker compose up -d web
```

**Why this works:** `marketlist.kecktech.net` and `farmbot.kecktech.net` are same-site (shared eTLD+1), so Devise session cookies work in the iframe after CSP allows framing.

**Do not** attempt path-prefix (`marketlist…/farmbot-app`) — FarmBot assumes root-of-host.

Store the one-line patch in `/opt/farmbot/patches/frame-ancestors.patch` and re-apply on upgrades.

## Traefik

1. DNS: `farmbot.kecktech.net` → Traefik public IP (same as Marketlist).
2. Copy [`deploy/traefik/farmbot.yml`](../deploy/traefik/farmbot.yml) to `/opt/docker/traefik/dynamic/farmbot.yml` on `prod-traefik-01`.
3. Ensure Traefik has TCP entrypoints on `8883` and `3002` (see file comments).

## Marketlist token (food loop + robot controls)

1. Open `https://farmbot.kecktech.net` (or Advanced authoring link) and sign in / create a FarmBot account.
2. Obtain an API token (`POST /api/tokens` or FarmBot account developer token UI).
3. In Marketlist Garden → FarmBot source → paste encoded JWT or full token JSON.
4. Token `iss` / `mqtt` claims must reference `farmbot.kecktech.net`.
5. Tokens are encrypted at rest (`TOKEN_ENCRYPTION_KEY`); never returned on GET.
6. Use Garden → **Open robot controls** for status, e-stop, sequences, peripherals (Marketlist API proxies REST/MQTT).

Dual auth is expected: Marketlist session ≠ FarmBot session. Marketlist never exposes the FarmBot token to the browser for control.

## Device pairing

1. Flash FarmBot OS; set server to `farmbot.kecktech.net`.
2. Ensure device can reach **443** and **8883**.
3. Complete pairing in the FarmBot Web App (advanced authoring / top-level host).

## Backup

Critical volumes under the compose project (typical names — confirm with `docker volume ls`):

- Postgres data
- Redis
- RabbitMQ
- Any uploaded images / blobs

Example:

```bash
cd /opt/farmbot/Farmbot-Web-App
sudo docker compose stop
sudo tar -czf /var/backups/farmbot-$(date +%Y%m%d).tgz docker_volumes .env
sudo docker compose start
```

Retain off-box copies (PBS / object storage).

## Update

```bash
cd /opt/farmbot/Farmbot-Web-App
sudo docker compose stop
sudo git pull
# Re-apply CSP frame_ancestors patch
sudo docker compose build web
sudo docker compose run web bundle exec rails db:migrate
sudo docker compose up -d
```

Expect brief downtime while assets rebuild.

## Restore

1. Stop compose.
2. Restore `docker_volumes` + `.env` from backup tarball.
3. Re-apply CSP patch if `application.rb` was overwritten.
4. `docker compose up -d`.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Assets / blank UI | Wait for webpack/bun build; `docker compose logs -f web` |
| MQTT device offline | Firewall / Traefik TCP 8883; `MQTT_HOST` |
| Browser controls dead (FarmBot SPA) | WSS 3002 / `MQTT_WS` |
| Marketlist sync / robot 502 | Token `iss` host; API reachable from Marketlist guest; MQTT 8883 from API |
| Marketlist e-stop timeout | Control MQTT session; device online; `from_device` replies |

## Day-1 smoke checklist

- [ ] HTTPS FarmBot UI loads (backend + advanced authoring)
- [ ] Marketlist web `/app/garden/farmbot` native robot controls: status + e-stop/unlock + sequences list
- [ ] Mobile native robot screen: same controls; Back to Garden
- [ ] Token paste → sync → harvest → pantry
- [ ] Ports 443 / 8883 / 3002 OK

## Guest DNS note (Kecktech)

Do **not** leave `search internal.kecktech.net` in `/etc/resolv.conf` on the FarmBot guest — Docker Hub names can resolve to Traefik (`10.20.0.100`) via search-domain append and break image pulls (wrong TLS cert). Prefer:

```
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 10.10.0.1
options ndots:5
```

## Dockerfile SSL/GPG note

If `api.Dockerfile` fails fetching `apt.postgresql.org` keys, replace the Postgres apt repo steps with distro packages only (`libpq-dev`, `build-essential`, `ca-certificates`) — DB runs in the `postgres` Compose service.

## Schema load

If `rails db:migrate` fails with missing `psql`, load schema via:

```bash
docker compose exec -T db psql -U postgres -d farmbot_prod < db/structure.sql
```

Do **not** set a placeholder `DATABASE_URL=...@host...` in `.env` — leave unset so `config/database.yml` uses `host: db`.

## Frontend assets (required or UI sticks on “Loading…”)

```bash
cd /opt/farmbot/Farmbot-Web-App
sudo docker compose run --rm web bundle exec rake assets:precompile
```

Output: `public/assets/dist/` served as `/assets/dist/...`. If Bun panics (“CPU lacks AVX”), set Proxmox guest CPU to `host` and reboot (`qm set <vmid> --cpu cputype=host`), then re-run precompile.
