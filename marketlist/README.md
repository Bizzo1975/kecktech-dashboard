# Marketlist

**Household food system** — acquire food (lists, recipes, garden / FarmBot, capture, prices), inventory (pantry + yields), consume (cook / meal log), and effect (calories, macros, spend, quiet suggestions).

**Primary client:** Expo (iOS/Android). **Web:** Next.js PWA. **API:** Express + PostgreSQL.

Home is trip-first: continue shopping, pantry urgency, household — no tutorial checklist.

**Production-ready bar:** fully built, secure (including dependency audit), reliable, factual sources only, and honest claims (lifestyle nutrition, not medical advice). See [`PROJECT_PLAN.md`](PROJECT_PLAN.md). Garden: [`docs/GARDEN.md`](docs/GARDEN.md).

**Status:** Hosted consumer service. **Not** App Store/Play submitted until you provide store credentials (see [`apps/mobile/STORE_LISTING.md`](apps/mobile/STORE_LISTING.md)).

## Production URL (Kecktech VMs)

| Piece | Where |
|-------|--------|
| App stack | `prod-dashboard-01` (`10.20.0.143`) — `/opt/docker/marketlist` |
| Edge | `prod-traefik-01` (`10.20.0.100`) — Traefik dynamic config |
| URL | `https://marketlist.kecktech.net` |
| FarmBot (self-host) | `https://farmbot.kecktech.net` — full manager opens **inside** Marketlist Garden |

**Demo (demo-only):** `demo@marketlist.app` / `demo12345`

Ops: [docs/OPS.md](docs/OPS.md) (backup, deploy, rollback, cookies). FarmBot: [docs/FARMBOT_SELFHOST.md](docs/FARMBOT_SELFHOST.md). DIY: [docs/FARMBOT_DIY_BOM.md](docs/FARMBOT_DIY_BOM.md).

### Deploy
```bat
deploy\deploy-to-dashboard.sh
```

### Mobile (prod API)
```bat
set EXPO_PUBLIC_API_URL=https://marketlist.kecktech.net/api
npm run dev:mobile
```

**Native / speech (required for voice capture):**
```bat
cd apps\mobile
eas login
eas init
eas build --profile development --platform android
eas build --profile preview --platform android
```
Speech does **not** work in Expo Go — install the native build.

### Local
```bat
startup-all.bat
```
Web `http://localhost:3001` · API `http://localhost:3000`

## Features
- Household switcher + invite codes, shared lists, Socket.IO sync
- Trip-first home, aisle check-off, trip complete → pantry (+ optional store price snapshot)
- Garden: outdoor beds, indoor trays (manual), FarmBot REST + MQTT sync, harvest → pantry, harvest-timed recipe boost
- Recipes → list, meal plans, **cook / meal log** with pantry deduct and kcal/macros when profiles exist
- Capture: OCR with prices, barcode (Open Food Facts name + nutriments when present), speech on native
- Price memory, household-scoped deals, list basket **estimates from real PriceHistory only**
- Insights: spend, restock, nutrition effect vs household goals — lifestyle disclaimer, not medical advice
- Mobile list + pantry mirror for offline shopping; web PWA shop loop is online; other mobile screens online-only with banners
- Web httpOnly refresh cookie (same-origin `/api`); CORS allowlisted
- Optional Sentry when DSN set

## Docs
- [PROJECT_PLAN.md](PROJECT_PLAN.md)
- [docs/API.md](docs/API.md) · [docs/OPS.md](docs/OPS.md) · [docs/PRIVACY.md](docs/PRIVACY.md) · [docs/GARDEN.md](docs/GARDEN.md) · [docs/FARMBOT_SELFHOST.md](docs/FARMBOT_SELFHOST.md) · [docs/FARMBOT_DIY_BOM.md](docs/FARMBOT_DIY_BOM.md)
- [apps/mobile/STORE_LISTING.md](apps/mobile/STORE_LISTING.md)

## License
MIT
