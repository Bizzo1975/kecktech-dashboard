# Contact form / alias test matrix results

Updated: 2026-08-12 (final verify on office LAN `10.10.0.100`, DNS `10.10.0.1`)

Shared mailbox OWA: https://outlook.office.com/mail/support@kecktech.net/

## LAN DNS gate (do not change)

| Check | Result |
|-------|--------|
| Ping `10.10.0.1` / `10.20.0.100` | OK |
| `nslookup google.com 10.10.0.1` | OK |
| `willworkforlunch.com` / `kecktech.net` via `10.10.0.1` | `10.20.0.100` (AdGuard rewrite) |
| Tailscale | `WantRunning=false`, `RouteAll=false`, `CorpDNS=false` |

## Public `/contact` pages (LAN path)

| Site | GET |
|------|-----|
| https://kecktech.net/contact | 200 |
| https://willworkforlunch.com/contact | 200 |
| https://jacob-roman.com/contact | 200 |
| https://unclejonsitgarage.com/contact | 200 |

## Form POST stamp `20260812-034155`

| Site | Recipient | Result |
|------|-----------|--------|
| kecktech | `support@kecktech.net` | `{"success":true}` HTTP 200 |
| willworkforlunch | `hello@willworkforlunch.com` | success HTTP 200 |
| jacob-roman | `hello@jacob-roman.com` | `{"success":true}` HTTP 200 |
| unclejons | `support@unclejonsitgarage.com` | Message sent |

Confirm these in OWA (subjects/bodies contain `Matrix Final` / `[TEST] … form 20260812-034155`).

## Alias inbound probes (optional)

```powershell
pwsh -File ops/email/12-send-alias-tests.ps1
```
