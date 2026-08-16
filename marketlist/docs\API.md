# Marketlist API Documentation

Base URL: `/api`  
Auth: `Authorization: Bearer <accessToken>` unless noted.

**Legend**
- **Implemented** — live on current API
- **Internal / admin** — authenticated but not part of consumer product UI
- **Follow-up** — specified but not fully shipped

---

## Health

### Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Auth**: No
- **Status**: Implemented
- **Success**: `{ "success": true, "data": { "status": "ok", "db": "up", "version": "...", "product": "Marketlist" } }`
- **Notes**: Pings Postgres via `sequelize.authenticate()`. Returns `503` when the database is down.

---

## Authentication

### Register
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth**: No
- **Status**: Implemented
- **Body**: `{ "email", "password", "name" }`

### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth**: No
- **Status**: Implemented

### Refresh
- **URL**: `/api/auth/refresh`
- **Method**: `POST`
- **Auth**: No (refresh token in body or cookie)
- **Status**: Implemented

### Logout
- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented

### Me / Profile
- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented

### Change Password
- **URL**: `/api/auth/password`
- **Method**: `PUT`
- **Auth**: Yes
- **Status**: Implemented

### Forgot Password
- **URL**: `/api/auth/forgot-password`
- **Method**: `POST`
- **Auth**: No
- **Status**: Implemented
- **Body**: `{ "email" }`
- **Notes**: Always returns success. Non-production may include `resetUrl` when SMTP is unset.

### Reset Password
- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Auth**: No
- **Status**: Implemented
- **Body**: `{ "token", "password" }`

---

## Households

### Create Household
- **URL**: `/api/households`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "name": "Home" }`

### Join Household
- **URL**: `/api/households/join`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "inviteCode": "ABC123" }`

### My Households
- **URL**: `/api/households`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented

---

## Item suggestions

### Suggest items (typeahead)
- **URL**: `/api/items/suggest`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented
- **Query**: `householdId` (required), `q` (optional)
- **Success**: `{ "suggestions": [{ "name", "source": "memory"|"pantry"|"catalog", "category", "aisleSection", "quantity", "unit" }] }`

---

## Grocery Lists

### Get Lists
- **URL**: `/api/lists`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented
- **Query**: `householdId`, `page`, `limit`

### Create List
- **URL**: `/api/lists`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "householdId", "name", "sortMode?" }`

### Get / Update / Delete List
- **URL**: `/api/lists/:id`
- **Methods**: `GET` | `PUT` | `DELETE`
- **Auth**: Yes
- **Status**: Implemented

### Copy List (templates)
- **URL**: `/api/lists/:id/copy`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "name"?, "type"?: "shopping" | "template" }`
- **Notes**: Copies items unchecked into a new list (`type` defaults to `shopping`).

### Complete trip
- **URL**: `/api/lists/:id/complete`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "addCheckedToPantry?": true }`
- **Success**: `{ "checkedCount", "remainingCount", "remaining", "pantryUpserts" }`

### List Items
- **URL**: `/api/lists/:id/items`
- **Methods**: `GET` | `POST`
- **Auth**: Yes
- **Status**: Implemented
- **POST body**: `{ "name", "category?", "aisleSection?", "quantity?", "unit?", "notes?" }`

### Update / Delete Item
- **URL**: `/api/lists/:listId/items/:itemId`
- **Methods**: `PUT` | `DELETE`
- **Auth**: Yes
- **Status**: Implemented
- **Check toggle**: `PUT` with `{ "checked": true }`

---

## Catalog Items (internal / admin)

> Consumer UI: Catalog screens on web (`/app/catalog`) and mobile. Also powers list typeahead via `GET /api/items/suggest` (source `"catalog"`).

### Get / Create Catalog Items
- **URL**: `/api/catalog/items`
- **Methods**: `GET` | `POST`
- **Auth**: Yes
- **Audience**: Internal / admin
- **Status**: Implemented
- **Query**: `page`, `limit`, `category`, `search`

---

## Account preferences

### Update dietary preferences
- **URL**: `/api/me/preferences`
- **Method**: `PATCH`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "dietaryPrefs": ["vegetarian"|"vegan"|"gluten_free"|"dairy_free", ...] }`
- **Notes**: Filters recipe suggestions; never auto-mutates lists. Distinct from `GET /api/me/export` (full data dump).

---

## Pantry

### Get / Create Pantry Items
- **URL**: `/api/pantry`
- **Methods**: `GET` | `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Query**: `householdId`, `expiringWithinDays`

### Update / Delete
- **URL**: `/api/pantry/:id`
- **Methods**: `PUT` | `DELETE`
- **Auth**: Yes
- **Status**: Implemented

### Add to List
- **URL**: `/api/pantry/:id/add-to-list`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "listId": "uuid" }`

---

## Recipes & Suggestions

### Recipe CRUD
- **URL**: `/api/recipes`
- **Methods**: `GET` | `POST`
- **URL**: `/api/recipes/:id`
- **Methods**: `GET` | `PUT` | `DELETE`
- **Auth**: Yes
- **Status**: Implemented

### Parse Recipe → Ingredients
- **URL**: `/api/recipes/parse`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "url": "https://..." }` or `{ "text": "..." }`

### Suggestions (pantry match %)
- **URL**: `/api/recipes/suggestions`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented
- **Query**: `householdId` (recommended)
- **Notes**: Ranks recipes by how many ingredients are already in the full pantry (match %). Respects dietary prefs. Does **not** require an expiring ingredient.

### Expiring Suggestions (cook-soon)
- **URL**: `/api/recipes/suggestions/expiring`
- **Method**: `GET`
- **Auth**: Yes
- **Status**: Implemented
- **Query**: `householdId` (recommended), optional window days (default 5)
- **Notes**: Subset of pantry-match suggestions that also use at least one pantry item expiring within the window. Powers the “Cook soon” UI. Distinct from `/recipes/suggestions` (all matches) and from `/insights/restock` (restock prompts, not recipes).

---

## Meal Plans

### List / Create
- **URL**: `/api/meal-plans`
- **Methods**: `GET` | `POST`
- **Auth**: Yes
- **Status**: Implemented
- **POST body**: `{ "plannedDate", "mealType?", "recipeId?", "householdId?", "notes?" }`

### Delete
- **URL**: `/api/meal-plans/:id`
- **Method**: `DELETE`
- **Auth**: Yes
- **Status**: Implemented

### Generate list from plans
- **URL**: `/api/meal-plans/generate-list`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**: `{ "listId", "from", "to", "missingOnly?": true }`

---

## Prices & Deals

> User/household price memory only — no store scrapers.

### Stores
- `GET /api/prices/stores` — Implemented
- `POST /api/prices/stores` — Implemented

### Upsert price
- `PUT /api/prices/items/:itemName/stores/:storeId` — Implemented
- `POST /api/prices` — Implemented

### History / Deals
- `GET /api/prices/items/:itemName/history` — Implemented
- `GET /api/prices/deals` — Implemented

---

## Capture

### Barcode lookup
- **URL**: `/api/capture/barcode`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented (Open Food Facts)
- **Body**: `{ "barcode": "..." }`

### Review lines
- **URL**: `/api/capture/review`
- **Method**: `POST`
- **Auth**: Yes
- **Status**: Implemented
- **Body**:
```json
{
  "listId": "uuid",
  "householdId": "uuid",
  "storeId": "uuid",
  "lines": [
    {
      "name": "Milk",
      "quantity": 1,
      "unit": "gal",
      "price": 3.49,
      "addToList": true,
      "addToPantry": false,
      "recordPrice": true
    }
  ]
}
```

### Receipt OCR
- **Status**: Implemented
- **URL**: `/api/capture/ocr`
- **Method**: `POST`
- **Auth**: Required
- **Body**: `{ imageBase64: string, mimeType?: "image/jpeg"|"image/png"|"image/webp" }`
- **Response**: `{ lines: string[], rawText: string, confidence: number|null, lineCount: number }`
- **Notes**: Tesseract OCR + receipt line heuristic; always review before `POST /capture/review`

### Voice / speech-to-text
- **Status**: Client-side only (no dedicated API route)
- **Mobile**: `expo-speech-recognition` on Capture — requires an Expo development build (not Expo Go)
- **Web**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) where the browser supports it; otherwise type transcript manually
- **Flow**: Speak → transcript field → review sheet → `POST /capture/review`

---

## Insights

## Nutrition / meal logs

- `POST /api/meal-logs` — Implemented — body `{ householdId, recipeId?, mealPlanId?, name?, mealType?, consumedAt, servingsEaten?, deductPantry? }` — rolls macros from recipe profiles; optional pantry deduct
- `GET /api/meal-logs?householdId=&from=&to=` — Implemented
- `GET /api/nutrition/day?householdId=&date=` — Implemented — day totals vs household goals
- `GET /api/nutrition/week?householdId=&from=&to=` — Implemented
- `GET /api/nutrition/profiles?q=` — Implemented
- `GET /api/recipes/:id/nutrition?householdId=` — Implemented — per-recipe / per-serving macros
- `PUT /api/meal-plans/:id` — Implemented

## Lists extras

- `POST /api/lists/:id/complete` — Implemented — `{ addCheckedToPantry?, storeId?, recordPricesFromMemory? }` — trip → pantry; optional price snapshot from household PriceHistory
- `GET /api/lists/:id/estimate` — Implemented — basket estimate from real PriceHistory only

## Garden

See [GARDEN.md](GARDEN.md).

- `GET /api/garden-sources?householdId=` — Implemented
- `POST /api/garden-sources` — Implemented — `{ householdId, type: manual|farmbot|indoor_tray, name, farmbotDeviceId?, farmbotApiToken? }`
- `PATCH /api/garden-sources/:id` — Implemented — token updates encrypted; token never returned
- `DELETE /api/garden-sources/:id` — Implemented
- `POST /api/garden-sources/:id/sync` — Implemented — FarmBot REST plant sync
- `GET /api/garden-sources/:id/farmbot/status` — Implemented — MQTT status cache (poll)
- `GET /api/garden-sources/:id/farmbot/device` — Implemented
- `GET /api/garden-sources/:id/farmbot/sequences` — Implemented
- `POST /api/garden-sources/:id/farmbot/sequences/:sequenceId/exec` — Implemented — `{ confirm: true }`
- `GET /api/garden-sources/:id/farmbot/regimens` — Implemented
- `GET /api/garden-sources/:id/farmbot/farm-events` — Implemented
- `GET /api/garden-sources/:id/farmbot/peripherals` — Implemented
- `POST /api/garden-sources/:id/farmbot/peripherals/:pinId/toggle` — Implemented — `{ confirm: true }`
- `GET /api/garden-sources/:id/farmbot/tools` — Implemented
- `GET /api/garden-sources/:id/farmbot/images` — Implemented
- `POST /api/garden-sources/:id/farmbot/photos/take` — Implemented — `{ confirm: true }`
- `GET /api/garden-sources/:id/farmbot/logs` — Implemented
- `POST /api/garden-sources/:id/farmbot/estop` — Implemented — `{ confirm: true }`
- `POST /api/garden-sources/:id/farmbot/unlock` — Implemented — `{ confirm: true }`
- `POST /api/garden-sources/:id/farmbot/home` — Implemented — `{ confirm: true, axis?, findHome? }`
- `POST /api/garden-sources/:id/farmbot/move` — Implemented — `{ confirm: true, x, y, z, speed? }`
- `POST /api/garden-sources/:id/farmbot/sync` — Implemented — `{ confirm: true }` device MQTT sync
- `POST /api/garden-sources/:id/farmbot/points` — Implemented — create Plant point
- `PATCH /api/garden-sources/:id/farmbot/points/:pointId` — Implemented
- `DELETE /api/garden-sources/:id/farmbot/points/:pointId` — Implemented
- `GET /api/garden-yields?householdId=&gardenSourceId?&status?` — Implemented
- `POST /api/garden-yields` — Implemented
- `PATCH /api/garden-yields/:id` — Implemented
- `DELETE /api/garden-yields/:id` — Implemented
- `POST /api/garden-yields/:id/harvest` — Implemented — `{ quantity?, unit?, expiryDate? }` → pantry

Recipe suggestions (`GET /api/recipes/suggestions`) include garden-ready / soon harvest matches when `householdId` is set.

## Insights

- `GET /api/insights/spending` — Implemented — query `householdId`
- `GET /api/insights/restock` — Implemented (opt-in; never auto-adds)

## Account export

- `GET /api/me/export` — Implemented — JSON export including lists/pantry/recipes/mealLogs/gardenSources (no cleartext FarmBot tokens)/gardenYields
- See also `PATCH /api/me/preferences` under Account preferences

---

## Realtime

- **Protocol**: Socket.IO
- **Auth**: access token on handshake
- **Rooms**: `household:{householdId}`
- **Events**: `list:updated`, `item:updated`, `pantry:updated`, `member:joined`
- **Status**: Implemented

---

## Error Response

```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "code": "ERROR_CODE"
  }
}
```

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`

---

## OpenAPI

When the API is running: `GET /api/docs` (Swagger UI) and `GET /api/docs.json`.
