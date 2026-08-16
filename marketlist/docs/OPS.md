# Marketlist operations runbook

## Hosts

| Piece | Host | Path / port |
|-------|------|-------------|
| App stack | `prod-dashboard-01` (`10.20.0.143`) | `/opt/docker/marketlist` — web `:8090`, API `:8091` |
| FarmBot Web App | `prod-farmbot-01` (`10.20.0.145`) | `/opt/farmbot/Farmbot-Web-App` — see [FARMBOT_SELFHOST.md](FARMBOT_SELFHOST.md) |
| Edge | `prod-traefik-01` (`10.20.0.100`) | `/opt/docker/traefik/dynamic/marketlist.yml` (+ `farmbot.yml`) |
| Public/LAN URL | — | `https://marketlist.kecktech.net` · FarmBot `https://farmbot.kecktech.net` |

Compose file in repo: `docker-compose.prod.yml`.

## Required production env

On the dashboard host `.env` (never commit):

- `DB_PASSWORD`
- `JWT_SECRET` (non-default)
- `JWT_REFRESH_SECRET` (non-default)
- `TOKEN_ENCRYPTION_KEY` (encrypts FarmBot tokens at rest; 64-char hex or long passphrase)
- optional `FARMBOT_PUBLIC_URL` / `NEXT_PUBLIC_FARMBOT_PUBLIC_URL` / `EXPO_PUBLIC_FARMBOT_PUBLIC_URL` (break-glass advanced authoring link to FarmBot designer; default `https://farmbot.kecktech.net`)
- optional `CORS_ORIGINS` (comma-separated; defaults include marketlist + localhost)
- optional `SENTRY_DSN`

FarmBot Web App self-host: [FARMBOT_SELFHOST.md](FARMBOT_SELFHOST.md). DIY parts research: [FARMBOT_DIY_BOM.md](FARMBOT_DIY_BOM.md).

API **refuses to boot** in `NODE_ENV=production` if JWT secrets are still the dev defaults.

## Deploy

From a Linux machine with `rsync`:

```bash
bash deploy/deploy-to-dashboard.sh
```

From Windows (no rsync): pack with `tar`, `scp` to dashboard, extract with `sudo tar --no-same-owner`, then:

```bash
cd /opt/docker/marketlist
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d
```

Helper script: `deploy/deploy-tar-scp.sh` (bash; prefers rsync-free path).

## Postgres backup

### Scheduled backups

On the dashboard host (Linux), install a daily cron (or systemd timer) that runs the repo script:

```bash
# Example crontab — 02:15 local time
15 2 * * * cd /opt/docker/marketlist && bash scripts/backup-db.sh >> /var/log/marketlist-backup.log 2>&1
```

From Windows admins with Docker access:

```powershell
cd F:\Github\grocery-app
powershell -File scripts\backup-db.ps1
```

Scripts write `backups/marketlist-YYYYMMDD-HHMMSS.sql`. **Copy backups off-box** (scp/rsync to durable storage). Retain at least 7 daily copies for consumer-grade recovery.

### Manual dump

```bash
cd /opt/docker/marketlist
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${DB_USER:-marketlist}" "${DB_NAME:-grocery_app}" \
  > "backup-$(date +%Y%m%d-%H%M%S).sql"
```

## Restore

1. Stop or pause write traffic if needed: `docker compose -f docker-compose.prod.yml stop api`
2. Restore:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "${DB_USER:-marketlist}" -d "${DB_NAME:-grocery_app}" < backup-YYYYMMDD-HHMMSS.sql
```

3. Restart API: `docker compose -f docker-compose.prod.yml start api`
4. Hit `GET /api/health` — expect `db: "up"`.

Windows PowerShell restore pipe example:

```powershell
Get-Content .\backups\marketlist-YYYYMMDD-HHMMSS.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U marketlist -d grocery_app
```

## Rollback

1. `docker compose -f docker-compose.prod.yml ps` — note image IDs
2. Checkout previous known-good tag / image
3. `docker compose -f docker-compose.prod.yml up -d`
4. Re-run health check

## Auth / cookies

Web uses same-origin `/api` proxy. Refresh token is set as httpOnly cookie `ml_refresh` on `/api` path. Access JWT stays in sessionStorage (short-lived). Mobile still uses SecureStore body tokens.

## Health / uptime

- Public: `GET https://marketlist.kecktech.net/api/health` — expect `success: true`, `db: "up"`.
- Monitor that endpoint externally (or cron curl) after deploys and overnight; page/Alert on 503 or `db: "down"`.

## Backup / restore drill (required once per host)

Document and run at least once on the dashboard VM:

1. Take a fresh dump with `scripts/backup-db.sh` (or manual `pg_dump` above).
2. Copy the dump off-box.
3. On a non-prod clone **or** maintenance window: restore into a scratch DB or pause API and restore as above.
4. Confirm `GET /api/health` and a login work.
5. Note date of last successful drill in your ops calendar.

## Incident path

| Severity | Examples | First actions |
|----------|----------|----------------|
| P1 | Auth broken, data leak suspicion, DB down | Stop public traffic if needed; rotate JWT secrets if leak; restore from last known-good backup; notify affected users |
| P2 | Capture/OCR down, nutrition path failing | Check API logs + `/api/health`; rollback to last good compose images if needed |
| P3 | Cosmetic / single-feature | File issue; patch in next deploy |

Contact for privacy/security: support@marketlist.app. Keep Sentry DSN optional; if enabled, scrub PII in event processors.

## Dependency audit policy

Before advertising production-ready:

1. Run `npm audit` at repo root (and workspaces).
2. Fix or upgrade all **Critical** and **High** that affect the **API runtime path** (express, jws/jsonwebtoken, path-to-regexp, validator used by sequelize, shell-quote if in API tree).
3. Document remaining Medium / Expo-toolchain transitive Highs in `docs/SECURITY_AUDIT.md` with owner and re-review date — never ship unmarked Criticals on the public API surface.
