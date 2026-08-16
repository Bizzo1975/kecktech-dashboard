# Auto-replies (Graph confirmations) + newsletter (Listmonk) + domain onboard

## Defaults

- **Contact forms** send a **Graph confirmation** to the submitter `From:` the brand alias.
- Staff notify still goes to the same brand alias (lands in `support@kecktech.net` shared mailbox).
- **Do not** use one M365 mailbox automatic reply for all brands (wrong From branding).
- **On-page success UI** is required on every form (email confirmation does not replace it).
- **Newsletter blasts** use **Listmonk**, not the shared mailbox UI. Shared mailbox = human inbox + Reply-To.

## Brand map

| Site | Notify To / Confirmation From | UI success |
|------|-------------------------------|------------|
| kecktech | `support@kecktech.net` | `#form-success` |
| WWFL | `hello@willworkforlunch.com` | `EnhancedContactForm` success banner |
| jacob | `hello@jacob-roman.com` | `ContactForm` success copy (no Kecktech mention) |
| unclejons | `support@unclejonsitgarage.com` | Laravel flash on `/contact` |

## Graph confirmation

Hosts use the Entra app `kecktech-contact-mailer` (`Mail.Send`):

- Send path user: `GRAPH_MAILBOX=support@kecktech.net` (shared mailbox).
- Visible `From:` brand alias (proxy address on the shared mailbox; org `SendFromAliasEnabled`).

Kecktech: `dashboard/website/api/graph_mail.php` → `graph_send_contact_confirmation()`.  
WWFL / jacob / unclejons: deployed under their app trees (see `ops/email/patches/`).

## Newsletter (WWFL-first)

Stack files: `ops/email/listmonk/`.

1. On WWFL host: copy compose + config to `/opt/docker/listmonk`, set DB password, `docker compose up -d`.
2. UI `:9000` — create admin, list **WWFL Newsletter**, enable double opt-in.
3. SMTP / send: authenticated send as `hello@willworkforlunch.com` or `newsletter@willworkforlunch.com` (alias on shared mailbox). Prefer M365 SMTP AUTH or Graph; **not** blasting from Outlook.
4. `Reply-To:` brand alias so replies land in the shared mailbox.
5. Wire signup: set `LISTMONK_URL`, `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`, `LISTMONK_LIST_UUID` on WWFL; use `ops/email/patches/wwfl-listmonk-subscribe.ts` from `/api/newsletter` / subscribers routes.
6. Cloudflare: confirm SPF includes `spf.protection.outlook.com`; add tracking domain only if needed. **Never** touch Unbound / AdGuard / LAN DNS / website A/AAAA.

Jacob lists later: same pattern; **never** cross-brand with Kecktech publicly.

## iPhone shared mailbox

See [10-outlook-shared-mailbox.md](10-outlook-shared-mailbox.md) — Outlook iOS → Add Shared Mailbox → `support@kecktech.net`.

## Add a new domain in ~10 minutes

**Live UI (preferred):** https://dash.kecktech.net/ops/email-onboard  
(Authelia + ops/support staff). Saves `contacts-registry.json` and prints the M365/Cloudflare checklist.

**CLI:** [contacts-registry.json](contacts-registry.json) + script:

```powershell
pwsh -File ops/email/17-onboard-domain.ps1 `
  -Domain example.com `
  -Primary hello@example.com `
  -Aliases info,noreply `
  -AutoReply `
  -Newsletter `
  -EmitCloudflareOnly
```

After M365 domain TXT is verified:

```powershell
pwsh -File ops/email/17-onboard-domain.ps1 -Domain example.com -Primary hello@example.com -ApplyM365
# or sync everything:
pwsh -File ops/email/17-onboard-domain.ps1 -FromRegistry -ApplyM365
```

Human gates: M365 domain verify TXT, Cloudflare login for mail RRsets, Listmonk admin password.

Agent usage: when asked to “add domain X”, edit the registry (or run `17-…` which updates it), then `-ApplyM365` / Cloudflare mail script. Prefer this over editing hardcoded arrays in `07-add-custom-domain-aliases.ps1` (deprecated pattern).

## Safety rails

- No Unbound / AdGuard / Tailscale / Office-PC IP changes.
- Cloudflare: mail-related RRsets only.
- Do not commit Graph secrets / Listmonk DB passwords (`graph-mailer.env.local`, host `.env`).
