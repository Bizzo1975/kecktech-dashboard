# Marketlist — Project Plan

**Working product name:** Marketlist  
**Last updated:** July 2026

---

## Production-ready definition (non-negotiable)

**Production ready** means we could advertise and sell this service without fearing litigation or embarrassment from stubs, insecure packages, or false claims.

| Pillar | Pass condition |
|--------|----------------|
| Fully built | Every advertised surface works end-to-end on web + mobile with real data — no mock, stub, or “coming soon” |
| Secure | AuthZ on household routes; no default secrets in prod; Helmet/CORS/rate limits; npm audit High/Critical clean or documented mitigated |
| Reliable | Migrations, backups, health checks, graceful failures, tests on critical paths |
| Factual | Prices/macros/deals only from real sources (user, OFF, USDA/seed, computed) — never invented |
| Honest / sellable | Docs, landing, Privacy, Terms match code. Nutrition is lifestyle information, not medical advice |
| Verified | Persona E2E + security + deps + live deploy — then only call it production ready |

## Product north star

Marketlist is a **complete household food system**: it monitors **acquiring, inventory, consumption, and effect** of food — recipes → lists, accurate prices, pantry truth, home garden / FarmBot harvests, meals → calories, quiet healthy guidance.

```
Acquire → Inventory → Consume → Effect
```

---

## Progress Tracker (honest)

| Domain | Status | Notes |
|--------|--------|-------|
| Foundation / Auth / Households | Production | JWT, invite codes, preferences |
| Lists / aisle / trip → pantry | Production | Shop loop |
| Recipes + parse + pantry match | Production | Expanding with servings/nutrition |
| Meal plans → list | Production | Consume/cook path in progress |
| Capture (barcode/OCR/review) | Production | Prices + nutriments retained |
| Price memory / deals / budget | Production | Household-scoped; AuthZ required |
| Nutrition / meal logs / goals | Production | Macros, goals, meal logs, recipe nutrition |
| Quiet healthy suggestions | Production | Full dietary prefs + quiet goal hints |
| Garden / FarmBot / harvest→pantry | Production | Manual + indoor_tray + FarmBot REST/MQTT; native Marketlist robot controls; self-host backend; harvest-timed recipes |
| Web / PWA / Electron wrap | Production | Electron store deferred |
| Security / deps / ops | Production | AuthZ + trust proxy; see docs/SECURITY_AUDIT.md |
| App Store / Play **submit** | Blocked on you | Credentials + screenshots |

| Tracker | Status |
|---------|--------|
| **Overall sellable food system** | Security + live smoke verified 2026-07-16. Persona Maestro/Playwright matrix still expanding in CI — do not claim App Store ship. |

---

## Live URL

- **URL:** `https://marketlist.kecktech.net`
- **Demo (demo-only):** `demo@marketlist.app` / `demo12345`
- See [README.md](README.md) and [docs/OPS.md](docs/OPS.md)

## Decisions locked

- Platform: Expo primary; Next.js web; Electron wrap optional
- AI posture: quiet automation — extract/organize/suggest from data; no medical claims; no chatty LLM coach in v1
- Nutrition: lifestyle informational (kcal/macros); Terms + UI disclaimer
- Consumption: meal log primary **and** pantry deduct for matched ingredients
- Offline: list/pantry mirror; other domains online-only with banners
- Garden: manual beds + indoor tray logging + FarmBot API (native Marketlist robot UI; self-hosted FarmBot as REST/MQTT backend; do not manufacture robots); no fake closed-hydro sync
- DIY hardware research: see docs/FARMBOT_DIY_BOM.md (Express-first); ops: docs/FARMBOT_SELFHOST.md

## Explicitly deferred (documented, not faked)

- App Store / Play submit until credentials provided
- Stripe billing UI
- Third-party WCAG audit firm
- LLM generative meal advisor
- Marketlist-branded physical garden robots (software integrates FarmBot instead; DIY BOM is research only)
