#Requires -Version 5.1
<#
.SYNOPSIS
  Post-purchase checklist runner. Prints exact Admin Center + DNS steps.
  Run after Business Basic tenant exists.
#>

Write-Host @"
=== Kecktech email cutover checklist ===

1) Buy/confirm Business Basic: https://admin.microsoft.com
2) Domains > Add:
   - kecktech.net
   - willworkforlunch.com
   - jacob-roman.com
   - unclejonsitgarage.com
3) Copy verification TXT + MX values from Admin Center into DNS
4) Run:  .\02-setup-shared-mailbox.ps1 -MemberUpn 'YOU@kecktech.net'
5) Entra app for Graph: see 05-entra-graph-app.md
6) Set on dashboard host .env:
   GRAPH_TENANT_ID=...
   GRAPH_CLIENT_ID=...
   GRAPH_CLIENT_SECRET=...
   GRAPH_MAILBOX=support@kecktech.net
7) Rebuild/restart kecktech-mailer
8) NumberBarn: https://www.numberbarn.com/ — update global.json phone when live
9) OWA shared mailbox > Settings > Compose and reply > Addresses to send from

Registry: contacts-registry.json
DNS notes: 03-dns-records.md
"@
