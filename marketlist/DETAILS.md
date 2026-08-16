# Marketlist — Product & Engineering Details

## Application Summary

**Marketlist** is a **household food system**: shared shopping lists, aisle sorting, pantry inventory, home garden / FarmBot harvests → pantry, recipes → lists, meal planning / logging, price memory, capture review, calorie/macro tracking from meals, and quiet goal-aware suggestions.

**Clients:** Expo mobile (primary), Next.js web/PWA, optional Electron wrap.  
**API:** TypeScript Express + Sequelize + PostgreSQL, Socket.IO household rooms.

### Food-system domains
- **Acquire:** lists, recipes, meal plans → shopping list, barcode/OCR/voice capture, price memory, garden beds / FarmBot sync
- **Inventory:** pantry qty/unit/expiry/low stock, garden yields ready/soon, cook-soon / match %
- **Consume:** cook or log meal → pantry deduct + nutrition rollup
- **Effect:** daily kcal/macros vs goals, spend vs budget, quiet dietary/goal/garden-harvest suggestions (not medical advice)

### Shipped / shipping capabilities
- JWT + refresh auth; household create/join; account delete + export
- Shared lists, aisle sort, trip complete → pantry (+ optional store price snapshot)
- Pantry urgency → list; recipes CRUD + URL/text parse + servings + macros when known
- Garden sources (manual / indoor_tray / FarmBot), yields, harvest → pantry, FarmBot REST + MQTT, harvest-timed recipe boost
- Native Marketlist robot controls against self-hosted FarmBot REST/MQTT at `farmbot.kecktech.net`
- Meal plans → generate missing-only list; meal log / cook with nutrition + pantry deduct
- User price memory, household-scoped deals, receipt lines with prices when OCR finds them
- Barcode → Open Food Facts name + nutriments when present
- Spending + restock + nutrition effect insights; lifestyle disclaimer on health surfaces
- Web/PWA + Electron; CI; Sentry when DSN set

### Key benefits
- Time: aisle-sorted lists and typeahead
- Waste: expiry-aware pantry, garden harvest timing, and cook suggestions
- Health: informational calories/macros from logged meals vs goals
- Money: household price memory and budget progress
- Household: one live list everyone can update
- Garden: home-grown produce into pantry and recipe ranking

---

## Tech Stack

### Clients
- Expo + Expo Router + TypeScript; NativeWind + shared tokens
- Next.js App Router web; Electron wraps web build
- Redux Toolkit (mobile); expo-sqlite offline; Socket.IO realtime

### Backend
- Node.js, Express (TypeScript), Sequelize + PostgreSQL + migrations
- JWT access + refresh sessions; Zod in `packages/shared`
- Helmet, rate limiting, Swagger at `/api/docs` (disabled/restricted in prod as configured)

### Tooling
- npm workspaces; Jest; Maestro smoke; GitHub Actions + EAS
- `startup-all.bat` / `startup-demo.bat` (Windows)

---

## Production-ready bar

See [PROJECT_PLAN.md](PROJECT_PLAN.md) and [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md). Live food-system + AuthZ + smoke are verified; App Store submit and full persona Maestro matrix remain blocked/expanding — do not overclaim those.

Nutrition copy is **lifestyle information**, not medical advice.

Legacy `src/` and `GroceryApp/` are archived — do not dual-maintain.

---

## Getting Started

See [README.md](README.md).

## Definition of Done

No stubs in shipped paths; loading/empty/error UI; a11y; shared Zod contracts; docs match reality; High/Critical deps mitigated.

## Security

- bcrypt; JWT + refresh; Helmet/CORS/rate limits
- Household membership checks on money, nutrition, and garden routes
- FarmBot API tokens encrypted at rest (`TOKEN_ENCRYPTION_KEY`); never returned on GET
- Parameterized Sequelize; SecureStore (mobile); httpOnly refresh cookie path on web
- Electron: `contextIsolation: true`, no `nodeIntegration`
- Data export `GET /api/me/export`; account delete

See also [docs/GARDEN.md](docs/GARDEN.md), [docs/FARMBOT_SELFHOST.md](docs/FARMBOT_SELFHOST.md), [docs/FARMBOT_DIY_BOM.md](docs/FARMBOT_DIY_BOM.md).

## License

MIT — see LICENSE.
