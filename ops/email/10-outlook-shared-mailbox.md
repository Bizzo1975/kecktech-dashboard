# Outlook — shared mailbox on PC and phone

Shared mailbox: **support@kecktech.net** (Kecktech Contact)  
Primary login: **JonathanKeck@KecktechITSolutions.onmicrosoft.com** (or your licensed UPN)

Full Access is already granted. Automapping may or may not show the mailbox until you add it explicitly on phone.

## Open on the web (proof link)

https://outlook.office.com/mail/support@kecktech.net/

1. On iPhone Safari (or any browser), open that URL.
2. Sign in with your **Microsoft 365 work** account (not personal Microsoft account).
3. You should see the shared inbox. If prompted to pick a mailbox, choose **support@kecktech.net**.

Do this first so you know the mailbox works before troubleshooting Outlook app UI.

## This PC (Outlook for Windows / new Outlook)

1. Open Outlook signed in as your M365 work account.
2. If the shared mailbox does not automap:
   - **Classic Outlook:** File → Account Settings → Account Settings → Change → More Settings → Advanced → Add → `support@kecktech.net`
   - **New Outlook:** Settings (gear) → Accounts → Shared with me / Add shared folder or mailbox → `support@kecktech.net`
3. Confirm you can open Inbox and set **From** to an alias when composing (Send from alias enabled org-wide).

## iPhone — Microsoft Outlook (required path)

Use the **Outlook** app from the App Store, not Apple Mail, for shared mailboxes.

### A. Install and sign in

1. Install **Microsoft Outlook** from the App Store.
2. Open Outlook → **Add Email Account** (or Settings → Accounts → Add Email Account).
3. Enter: `JonathanKeck@KecktechITSolutions.onmicrosoft.com` (or your licensed UPN).
4. Choose **Microsoft 365** / work or school if asked.
5. Complete MFA / password. Wait until the inbox for your licensed user appears.

### B. Add the shared mailbox

**Path A (common on current Outlook iOS):**

1. Tap your **profile picture / initials** (top left).
2. Tap the **envelope / mail accounts** row or **Accounts**.
3. Tap **Add Shared Mailbox** (or **Shared Mailboxes** → **Add**).
4. Type: `support@kecktech.net` → **Add**.
5. Pull to refresh. A new mailbox section **Kecktech Contact** / `support@kecktech.net` should appear in the folder list.

**Path B (if Add Shared Mailbox is under Settings):**

1. Tap profile picture → **Settings** (gear).
2. Under **Mail Accounts**, tap your work account.
3. Tap **Shared Mailboxes** → **Add Shared Mailbox**.
4. Enter `support@kecktech.net` → Done.

**Path C (older Outlook builds):**

1. Profile → **Add Account** is wrong for shared — do not add a second full account with the shared address.
2. Use Path A/B only. Shared mailbox is not a separate licensed login.

### C. Confirm it works

1. Open the shared mailbox Inbox.
2. You should see prior `[TEST]` / contact-form messages.
3. Compose → set **From** to an alias if the picker shows them (e.g. `hello@willworkforlunch.com`).

### Troubleshooting

| Symptom | Fix |
|--------|-----|
| Shared mailbox option missing | Update Outlook from App Store; sign out/in of the work account |
| “Could not find mailbox” | Confirm Full Access in M365 admin; wait 15–60 min after permission change; verify OWA link above works |
| Wrong account (personal) | Remove personal account from Outlook; work account must be the M365 tenant user |
| Apple Mail only | Shared mailbox UX is unreliable there — use Outlook app |

## Android (brief)

Outlook → account avatar → **Add Shared Mailbox** → `support@kecktech.net` (same idea as iOS).

## Test subjects to look for

After alias/form tests, subjects look like:

`[TEST] <site-or-brand> <alias@domain>`  
`[General Question] …` / `[Contact] …` from site forms
