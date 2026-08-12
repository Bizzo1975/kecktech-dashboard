# Actions only you can finish

## Confirm mailbox

Open shared mailbox OWA and confirm today’s form tests:

https://outlook.office.com/mail/support@kecktech.net/

Optional alias probes (interactive Graph login):

```powershell
pwsh -File ops/email/12-send-alias-tests.ps1
```

## Optional: NumberBarn phone (kecktech.net only)

https://www.numberbarn.com/ — prefer 316 area code

- Forward to your cell
- Reply with the new number to publish on kecktech.net only
- Do **not** port Google Voice `(316) 768-0034`
- Phone stays unpublished until you buy one

## Already done

- Mailcow VM **110** shut down
- Cloudflare MX/SPF/autodiscover/DMARC for all four domains → M365
- Graph mailer live on kecktech (`/api/contact.php` → shared mailbox)
- Brand `/contact` forms: WWFL `hello@`, jacob `hello@`, unclejons `support@`
- AdGuard rewrites + Unbound privatedomain for brand zones (do not retouch during mail work)
- Phone purged from public pages; Outlook guide `10-outlook-shared-mailbox.md`
- Matrix notes: `ops/email/15-test-matrix-results.md`

## Office-PC DNS safety

- IP `10.10.0.100` / gw `10.10.0.1` / DNS prefer `10.10.0.1` (optional `8.8.8.8` secondary only)
- Tailscale: `WantRunning=false`, `RouteAll=false`, `CorpDNS=false` while on mgmt LAN
- **Never** edit Unbound forwarders, AdGuard bind port, or Tailscale routes for mail/contact work
