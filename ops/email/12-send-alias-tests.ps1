# Send one inbound test per site/alias into the shared mailbox.
# Requires interactive Microsoft Graph device login (Mail.Send as your user is NOT enough for app-only;
# this script sends FROM your mailbox TO each alias so MX delivers into support@).
#
# Usage:
#   pwsh -File ops/email/12-send-alias-tests.ps1
# Does not touch DNS / OPNsense / AdGuard / Tailscale.

$ErrorActionPreference = "Stop"

$targets = @(
  @{ Site = "kecktech"; Address = "support@kecktech.net" },
  @{ Site = "kecktech"; Address = "help@kecktech.net" },
  @{ Site = "kecktech"; Address = "info@kecktech.net" },
  @{ Site = "kecktech"; Address = "sales@kecktech.net" },
  @{ Site = "willworkforlunch"; Address = "hello@willworkforlunch.com" },
  @{ Site = "willworkforlunch"; Address = "info@willworkforlunch.com" },
  @{ Site = "jacob-roman"; Address = "hello@jacob-roman.com" },
  @{ Site = "unclejons"; Address = "support@unclejonsitgarage.com" }
)

Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Users.Actions -ErrorAction SilentlyContinue

Connect-MgGraph -Scopes "Mail.Send","User.Read" -UseDeviceCode -NoWelcome
$me = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/me").userPrincipalName
Write-Host "Sending as $me"

foreach ($t in $targets) {
  $subj = "[TEST] $($t.Site) $($t.Address)"
  $body = @{
    message = @{
      subject = $subj
      body = @{ contentType = "Text"; content = "Inbound alias delivery check for $($t.Address) at $(Get-Date -Format o)." }
      toRecipients = @(@{ emailAddress = @{ address = $t.Address } })
    }
    saveToSentItems = $true
  } | ConvertTo-Json -Depth 6

  try {
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/me/sendMail" -Body $body -ContentType "application/json"
    Write-Host "OK  $subj"
  } catch {
    Write-Warning "FAIL $subj : $_"
  }
  Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Open shared mailbox Inbox:"
Write-Host "https://outlook.office.com/mail/support@kecktech.net/"
Disconnect-MgGraph | Out-Null
