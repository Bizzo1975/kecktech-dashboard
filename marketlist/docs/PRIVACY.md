# Marketlist Privacy Policy

**Last updated:** July 2026  
**Contact:** [support@marketlist.app](mailto:support@marketlist.app)

This policy describes how Marketlist (“we”, “us”) collects, uses, stores, and deletes personal data when you use the Marketlist web app, mobile apps, and API.

Related: [Terms of Service](/terms) on the hosted site (`https://marketlist.kecktech.net/terms`).

---

## What we collect

- **Account:** email address, display name, and password hash (we never store plaintext passwords).
- **Household:** household names, invite codes, membership, and roles.
- **App data you create:** shopping lists and items, pantry items, **garden sources and yield/harvest events**, recipes (including servings), meal plans, **meal logs** (kcal/macros when computed), optional price history and stores you enter, staples/catalog entries, dietary preferences, and **optional household nutrition goals**.
- **Optional FarmBot connection:** if you connect a FarmBot, we store an **encrypted** API token and plant/point identifiers synced from FarmBot. When the operator self-hosts FarmBot Web App (for example at `farmbot.kecktech.net`), that server is the device/API/MQTT backend. Marketlist provides native robot controls in-app and stores the encrypted token plus synced yield rows needed for pantry/recipes. FarmBot account credentials are separate from your Marketlist account; Marketlist does not return FarmBot tokens to the client.
- **Optional product lookups:** when you scan a barcode, we may query [Open Food Facts](https://world.openfoodfacts.org/) to resolve product names and, when available, nutriment values. That lookup sends the barcode to Open Food Facts under their terms; we may store product nutrition profiles you use.
- **Nutrition estimates:** recipe and meal-log calories/macros may use Open Food Facts data, seeded USDA-style reference profiles, or values you record. These are **lifestyle estimates, not medical advice**.
- **Technical:** authentication tokens (refresh sessions), optional password-reset tokens (short-lived), and standard server logs needed to operate the service.

We do **not** sell personal data. We do **not** show third-party ads.

---

## How we use data

- Authenticate you and sync household data across devices.
- Power list collaboration, pantry, garden harvests, recipes, meals, meal logging, price memory, and capture (barcode / OCR review).
- Sync plant data from FarmBot when you connect a token (REST + Message Broker).
- Compute lifestyle nutrition estimates and quiet dietary/goal/garden-harvest suggestions (not clinical coaching).
- Send transactional email when SMTP is configured (for example password-reset messages).
- Optionally report application errors to Sentry when a Sentry DSN is configured by the operator (see below).

---

## Nutrition & health information (not medical advice)

Marketlist provides **informational** calorie and macro tracking based on foods you log and reference data (Open Food Facts, seeded profiles, your entries). It does **not** diagnose, treat, or provide medical or clinical advice. Household members who share a household can see shared pantry, lists, and household goals; meal logs are associated with your account within that household context.

---

## Retention

| Data | Retention |
|------|-----------|
| Account & household content | Until you delete the account or the household data is removed |
| Refresh sessions | Until logout, rotation expiry, or account deletion |
| Password-reset tokens | Short-lived (typically a few hours); deleted after use or expiry |
| Server / access logs | Operator-controlled; typically short operational windows |
| Database backups | Operator-controlled; see [OPS.md](OPS.md) — backups may retain deleted data until their own retention expires |

---

## Open Food Facts

Barcode capture may call Open Food Facts to look up publicly contributed product data. Marketlist does not share your account email or household contents with Open Food Facts for that lookup—only the barcode value needed for the query. Product attribution and Open Food Facts’ own privacy policy apply to their database.

---

## Error monitoring (Sentry) — optional

If the deployment sets `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN`, crash and error events may be sent to Sentry. When those variables are unset, Sentry SDKs no-op and no error events are sent. Operators should configure Sentry according to their own compliance needs.

---

## Your choices

- **Export:** Settings → Export my data (`GET /api/me/export`).
- **Delete account:** Settings → Delete account (authenticated), or email [support@marketlist.app](mailto:support@marketlist.app).
- **Deletion SLA:** We aim to complete account and associated personal data deletion within **30 days** of a verified request (sooner when you delete in-app). Backups may retain residual copies until they rotate per the operator’s backup schedule.

---

## Security

Passwords are hashed with bcrypt. Access tokens are short-lived JWTs; web refresh tokens use an httpOnly cookie where applicable; mobile tokens use SecureStore. Production deployments must use non-default JWT secrets and an allowlisted CORS origin set.

---

## Children

Marketlist is intended for adults managing household shopping. It is not directed at children under 13 (or the equivalent minimum age in your region).

---

## Contact

Privacy and deletion requests: **support@marketlist.app**

Hosted product URL (LAN / production): see [README.md](../README.md) and [OPS.md](OPS.md).

Terms: `/terms` on the web app.
