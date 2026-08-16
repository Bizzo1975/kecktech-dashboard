# DNS cutover — Microsoft 365 Exchange Online

After domains are added in admin.microsoft.com → Settings → Domains, use the **exact** MX/TXT/CNAME values Microsoft shows (tenant-specific).

## Domains to verify (Authoritative)

1. `kecktech.net`
2. `willworkforlunch.com`
3. `jacob-roman.com`
4. `unclejonsitgarage.com`

## Records to publish (per domain)

| Type | Name | Value (example — replace with Admin Center values) |
|------|------|------------------------------------------------------|
| MX | `@` | `0 <tenant>.mail.protection.outlook.com` |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` |
| CNAME | `autodiscover` | `autodiscover.outlook.com` |
| TXT | `@` | DMARC: `v=DMARC1; p=none; rua=mailto:support@kecktech.net` |
| CNAME | DKIM selectors | From Defender → Email authentication → DKIM (enable per domain) |

## Remove after cutover

- MX pointing at `mail.kecktech.net`
- Old SPF `v=spf1 mx ~all` (replace, do not leave both)

## Order

1. Add + verify domain TXT in M365
2. Create shared mailbox + aliases (`02-setup-shared-mailbox.ps1`)
3. Publish MX/SPF/DKIM/DMARC
4. Test inbound to each alias
5. Enable DKIM signing in Defender

## TTL

Lower MX TTL to 300s before cutover if currently higher.
