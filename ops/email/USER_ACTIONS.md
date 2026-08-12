# Actions only you can finish (payment / DNS / OWA)

Agent completed everything that does not require your Microsoft billing login or a purchased NumberBarn number.

## 1. Buy Microsoft 365 Business Basic (~$7/user/mo)

Page opened in browser / use: https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-business-basic

- Create a **new work tenant** (do not use Personal)
- 1 license for yourself
- Then run `ops/email/02-setup-shared-mailbox.ps1 -MemberUpn 'you@kecktech.net'`
- Follow `ops/email/03-dns-records.md` and `ops/email/05-entra-graph-app.md`
- Checklist: `ops/email/06-post-purchase-checklist.ps1`

## 2. Buy NumberBarn Call Forwarding (~$6.99/mo)

https://www.numberbarn.com/ — prefer 316 area code

- Forward to your cell
- Reply here with the new number → we will update `global.json` / `contact.json` (kecktech.net only)
- Do **not** port Google Voice `(316) 768-0034`

## Already done

- Mailcow VM **110** shut down on Proxmox (`status: stopped`)
- Graph mailer code (replaces Mailcow SMTP)
- Shared mailbox PowerShell + DNS/Graph docs + contact registry
- Per-app `contactEmail` on demos
- willworkforlunch `ADMIN_EMAIL=jon@willworkforlunch.com`
- jacob-roman footer `hello@jacob-roman.com`
- unclejons `MAIL_FROM_ADDRESS=support@unclejonsitgarage.com`
