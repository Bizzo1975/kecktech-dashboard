# Kecktech demos + MSP readiness

## Dual client content (persona `kecktech`)

| Angle | Audience | Proof |
|-------|----------|-------|
| Break/fix IT | Wichita trust / MSP | Reliability, response, senior-safe IT |
| Development | Buyers of custom apps | Live demos on `/demos` + Portfolio screenshots |

Both use siteKey `kecktech` with different Inbox angles — not separate siteKeys.

## Marketing `/demos` allowlist (public HTML)

Public [demos.json](../../dashboard/website/src/data/demos.json) / https://www.kecktech.net/demos shows **only** these ids (unique):

`marketlist` · `flooros` · `portal` · `farmbot` · `cleaner` · `argo` · `netops` · `chat` · `sovereign-hub` · `aerocad`

Slug aliases when CMS/Portfolio use older names: `net-ops`→`netops`, `kecktech-portal`→`portal`, `chat-kecktech`→`chat`, `sovereign`→`sovereign-hub`, `syll`→`aerocad`.

CMS `syncProjectsToDemosJson` **replaces** `apps[]` with the allowlist (never merge-retain orphans like help/LiT/homepage). After Sync that touches demos.json, run Astro rebuild (`/opt/kecktech-astro-rebuild/kecktech-astro-rebuild.sh`).

## Portfolio catalog (SSOT — can be wider)

Portfolio may hold ops apps (dash, help, Claudette, DebateForge WIP, games) **without** putting them on marketing `/demos`. Only allowlisted slugs should include `kecktech` in `displaySites` if you want them on the public demos page.

After UI changes: ME Manager Portfolio → **Capture UI**.  
Weekly: Portfolio Sync — then spot-check `/demos` still matches the allowlist.

Canonical marketing HTML: `kecktech-dashboard/dashboard/website` (see `CANONICAL.md`).  
CMS bridges: `kecktech/Kecktech/website` on `:8085` (`DEMOS_JSON_PATH=/astro-data/demos.json`).

## Lead path

1. Brand contact forms → Graph / shared mailbox `support@` (and brand aliases)  
2. Log stub lead in ERPNext CRM even at zero clients  
3. Zammad ticket when work starts  
4. Do **not** wait for Stripe to start outreach (5 enrichments/week per DAILY-TASKS)

## Contact → ticket verification

- Astro contact: `dashboard/website` + `api/contact.php` / Graph mailer  
- Dash Today + tickets.kecktech.net still opened daily (expect empty until clients)

See [MONETIZATION_READINESS.md](./MONETIZATION_READINESS.md) for Stripe/portal before first invoice.
