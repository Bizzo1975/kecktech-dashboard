# Store data safety questionnaire — Marketlist

Fill this when preparing App Store / Google Play submissions. Answers should match the live product and [PRIVACY.md](PRIVACY.md).

## App Store Connect — App Privacy

| Question | Answer |
|----------|--------|
| Do you or your third-party partners collect data from this app? | Yes — account, user content, and optional diagnostics |
| Contact Info — Email Address | Collected: Yes · Linked to user: Yes · Used for: App Functionality · Tracking: No |
| Contact Info — Name | Collected: Yes · Linked to user: Yes · Used for: App Functionality · Tracking: No |
| User Content — Other User Content | Lists, pantry, recipes, meal plans, prices entered by the user · Linked: Yes · Tracking: No |
| Identifiers — User ID | Account UUID · Linked: Yes · Tracking: No |
| Diagnostics — Crash Data | Optional via Sentry when operator sets a DSN · Linked: No preferred · Tracking: No |
| Purchases / Advertising / Location / Health | Not collected |
| Do you use data for tracking? | No |

## Google Play — Data safety

| Data type | Collected? | Shared? | Purpose | Optional? | Encrypted in transit? |
|-----------|------------|---------|---------|-----------|------------------------|
| Email | Yes | No | Account auth / reset | Required for account | Yes (HTTPS) |
| Name | Yes | No | Account display | Required | Yes |
| User-generated content | Yes | No (household-only sync) | App functionality | User-created | Yes |
| App interactions / crash logs | Optional (Sentry DSN) | With Sentry if enabled | Stability | Optional | Yes |
| Device IDs / Advertising ID | No | — | — | — | — |
| Precise location | No | — | — | — | — |

### Deletion

- In-app account delete (Settings) and email [support@marketlist.app](mailto:support@marketlist.app)
- Target SLA: within 30 days of verified request (see PRIVACY.md)
- Data export: Settings → Export my data

### Third parties

- Open Food Facts: barcode lookup only (barcode value), not account email
- Sentry: only if DSN configured by operator
- SMTP provider: only if SMTP_* configured (transactional mail)

### Children

Not directed at children under 13 (or regional equivalent).
