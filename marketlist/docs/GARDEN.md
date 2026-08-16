# Marketlist Garden

Home gardens and FarmBot feed the same Acquire → Inventory → Consume → Effect loop as grocery capture.

## Source types

| Type | Meaning |
|------|---------|
| `manual` | Outdoor bed / plot — user enters plants and harvest windows |
| `indoor_tray` | Indoor hydro / tray logging — **manual only** (no Gardyn/AeroGarden API exists) |
| `farmbot` | Connects to [FarmBot REST API](https://developer.farm.bot/v15/docs/web-app/rest-api.html) + Message Broker |

## Data model

- `garden_sources` — household garden connection (token encrypted at rest for FarmBot)
- `garden_yield_events` — plants with status `planted | growing | ready | harvested`
- Harvest → creates/updates `pantry_items`, sets `harvestedPantryItemId`

## FarmBot

1. User pastes **encoded JWT** or full `/api/tokens` JSON into Marketlist (never returned on GET).
2. Token encrypted with `TOKEN_ENCRYPTION_KEY` (AES-256-GCM).
3. REST uses token `iss` (self-hosted e.g. `https://farmbot.kecktech.net` or my.farm.bot).
4. `POST /garden-sources/:id/sync` fetches `/api/points`, upserts Plant rows by `farmbotPlantId`.
5. On boot / connect, MQTT subscribes to `bot/{device}/sync/Point/#` for live plant updates.
6. Plant stage mapping: planned→planted, planted→growing, sprouted→ready, harvested→harvested.
7. Soft harvest window: planted_at + 45–75 days when FarmBot has no maturity data.
8. **Native Robot controls** (Garden → Open robot controls / per-source Robot): Marketlist UI for status, e-stop/unlock, home/move, run sequences, peripherals, photos, logs, and plant CRUD via Marketlist API proxy (server-side REST + MQTT RPC). Tokens never leave the API.
9. Self-hosted FarmBot remains the device/API/MQTT backend. Map/sequence *authoring* (Farm Designer / Sequence Editor) is break-glass only via `FARMBOT_PUBLIC_URL` / `NEXT_PUBLIC_FARMBOT_PUBLIC_URL` / `EXPO_PUBLIC_FARMBOT_PUBLIC_URL` (advanced link, not primary UX). Ops: [FARMBOT_SELFHOST.md](FARMBOT_SELFHOST.md). DIY hardware: [FARMBOT_DIY_BOM.md](FARMBOT_DIY_BOM.md).

## Recipes

`GET /recipes/suggestions` boosts recipes that match ready / soon-ready yields (within 7 days) and quiet-hints garden produce. Lifestyle only — not medical advice.

## Security

- Household membership on every garden route
- Dangerous robot actions require `confirm: true`
- Tokens never logged or exported in cleartext
- Closed-brand “sync” is not claimed anywhere
