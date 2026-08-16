# Buy Microsoft 365 Business Basic (required)

Personal Microsoft 365 cannot host shared mailboxes. Create a **separate company tenant**.

## Purchase

1. Open: https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-business-basic
2. Choose **Buy now** (annual ~$7/user/mo) or start a trial if offered.
3. When prompted for organization:
   - Organization name: **Kecktech IT Solutions LLC** (or your legal name)
   - Create a new work account (e.g. `admin@kecktech.onmicrosoft.com` first, then add custom domain)
4. Buy **1 license**. Keep your Personal subscription for home apps — do not cancel it.

## After purchase

1. Sign in at https://admin.microsoft.com with the **work** admin account.
2. Run `02-setup-shared-mailbox.ps1` (Exchange Online PowerShell).
3. Add domains and DNS per `03-dns-records.md`.

## Verify you are on Business (not Personal)

- You can open https://admin.microsoft.com and see **Teams & groups → Shared mailboxes**.
- If you only see account.microsoft.com, you are still on Personal.
