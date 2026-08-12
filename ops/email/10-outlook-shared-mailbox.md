# Outlook — shared mailbox on PC and phone

Shared mailbox: **support@kecktech.net** (Kecktech Contact)  
Primary login: **JonathanKeck@KecktechITSolutions.onmicrosoft.com** (or your licensed UPN)

## Open on the web (proof link)

https://outlook.office.com/mail/support@kecktech.net/

Sign in with your Microsoft 365 work account. You should see the shared inbox (Full Access already granted).

## This PC (Outlook for Windows / new Outlook)

1. Open Outlook signed in as your M365 work account.
2. If the shared mailbox does not automap:
   - **Classic Outlook:** File → Account Settings → Account Settings → Change → More Settings → Advanced → Add → `support@kecktech.net`
   - **New Outlook:** Settings → Accounts → Shared with me / Add shared folder → `support@kecktech.net`
3. Confirm you can open Inbox and set **From** to an alias when composing (Send from alias enabled org-wide).

## Phone (Outlook mobile)

1. Install **Microsoft Outlook** (iOS/Android).
2. Add work account: `JonathanKeck@KecktechITSolutions.onmicrosoft.com` (or your UPN).
3. Tap your account → **Add Shared Mailbox** → `support@kecktech.net`.
4. Confirm the same test messages appear.

## Test subjects to look for

After `ops/email/11-send-alias-tests.ps1` runs, subjects look like:

`[TEST] <site-or-brand> <alias@domain>`
