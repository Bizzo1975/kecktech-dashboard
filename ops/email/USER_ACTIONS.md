# Actions only you can finish

> **Daily ops (complete loop):** [ops/presence/DAILY_OPERATOR_LOOP.md](../presence/DAILY_OPERATOR_LOOP.md) — MSP + NetOps + ME Manager. This file is email-only follow-ups.

## Confirm mailbox + iPhone

Open shared mailbox OWA and confirm today’s form tests (staff + confirmation):

https://outlook.office.com/mail/support@kecktech.net/

Add `support@kecktech.net` on iPhone Outlook — exact taps in `10-outlook-shared-mailbox.md`.

## Email domain onboard (live)

https://dash.kecktech.net/ops/email-onboard

Authelia + ops/support. Saves registry and prints M365/Cloudflare checklist. CLI still: `ops/email/17-onboard-domain.ps1`.

Optional alias probes (interactive Graph login):

```powershell
pwsh -File ops/email/12-send-alias-tests.ps1
```

## Listmonk (WWFL newsletter) — finish in UI

Stack is up on WWFL host: `http://10.20.0.203:9000`  
Credentials file on host (do not commit): `/opt/docker/listmonk/CREDENTIALS.txt`

1. Open Listmonk UI — create/login admin if first-run prompts (TOML admin fields are deprecated in v6; prefer Users dashboard).
2. Settings → SMTP: send as `hello@willworkforlunch.com` (or `newsletter@`) via M365 SMTP AUTH / approved path.
3. Set campaign **From** / **Reply-To** to `hello@willworkforlunch.com` (replies → shared mailbox).
4. List **WWFL Newsletter** already created (double opt-in); confirm UUID/id match WWFL `LISTMONK_*` env.
5. Send one **test campaign to yourself**.
6. Optional: create an API token in Listmonk and replace `LISTMONK_API_TOKEN` on WWFL (currently uses admin basic auth from setup).

Signup API is wired to Listmonk when `LISTMONK_*` env is set (`/api/newsletter/subscribers`).

## Optional: NumberBarn phone (kecktech.net only)

https://www.numberbarn.com/ — prefer 316 area code

- Forward to your cell
- Reply with the new number to publish on kecktech.net only
- Do **not** port Google Voice `(316) 768-0034`
- Phone stays unpublished until you buy one

## Already done

- Mailcow VM **110** shut down
- Cloudflare MX/SPF/autodiscover/DMARC for all four domains → M365
- Graph mailer + **submitter confirmation** on all four contact forms
- On-page success UI verified (kecktech / WWFL / jacob / unclejons)
- Listmonk deployed WWFL-first; registry + `16-autoreply-and-newsletter.md` + `17-onboard-domain.ps1`
- Brand `/contact` forms: WWFL `hello@`, jacob `hello@`, unclejons `support@`
- AdGuard rewrites + Unbound privatedomain for brand zones (do not retouch during mail work)
- Phone purged from public pages; Outlook guide `10-outlook-shared-mailbox.md`
- Matrix notes: `ops/email/15-test-matrix-results.md`

## Office-PC DNS safety

- IP `10.10.0.100` / gw `10.10.0.1` / DNS prefer `10.10.0.1` (optional `8.8.8.8` secondary only)
- Tailscale: `WantRunning=false`, `RouteAll=false`, `CorpDNS=false` while on mgmt LAN
- **Never** edit Unbound forwarders, AdGuard bind port, or Tailscale routes for mail/contact work
