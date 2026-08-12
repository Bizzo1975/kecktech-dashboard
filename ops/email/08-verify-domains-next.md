# Domain verification (required before support@kecktech.net works)

Shared mailbox is live as:
**support@KecktechITSolutions.onmicrosoft.com**

Custom aliases (`support@kecktech.net`, app aliases, other brands) need these domains verified in Admin Center:

1. https://admin.microsoft.com → **Settings → Domains → Add domain**
2. Add in this order (Authoritative):
   - `kecktech.net`
   - `willworkforlunch.com`
   - `jacob-roman.com`
   - `unclejonsitgarage.com`
3. Publish the DNS TXT (and later MX/SPF/DKIM) records Microsoft shows at your DNS host (Cloudflare / registrar).
4. Click **Verify** in Admin Center.
5. Run:

```powershell
cd F:\Github\kecktech-dashboard\ops\email
.\07-add-custom-domain-aliases.ps1 -SetPrimaryToKecktech
```

That promotes **support@kecktech.net** to primary and adds all per-app / multi-brand aliases.

## DNS after verify (mail delivery)

Replace MX currently pointing at `mail.kecktech.net` with Microsoft’s MX (`*.mail.protection.outlook.com`). See `03-dns-records.md`.
