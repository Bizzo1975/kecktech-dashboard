# Send one inbound test per site/alias into the shared mailbox
# Run from Office-PC after: Connect-ExchangeOnline -UserPrincipalName <your licensed UPN>
# Or use Outlook/OWA to send manually using the same subjects.

param(
  [string]$FromMailbox = "support@kecktech.net",
  [string]$ToMailbox = "support@kecktech.net"
)

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

if (-not (Get-Module -ListAvailable ExchangeOnlineManagement)) {
  throw "Install-Module ExchangeOnlineManagement -Scope CurrentUser"
}

Import-Module ExchangeOnlineManagement
if (-not (Get-ConnectionInformation -ErrorAction SilentlyContinue)) {
  Connect-ExchangeOnline -ShowBanner:$false
}

foreach ($t in $targets) {
  $subj = "[TEST] $($t.Site) $($t.Address)"
  Write-Host "Sending $subj ..."
  Send-MailMessage -From $FromMailbox -To $ToMailbox -Subject $subj -Body "Inbound alias delivery check for $($t.Address) at $(Get-Date -Format o). Open shared mailbox Inbox." -SmtpServer localhost -ErrorAction SilentlyContinue
  # Prefer Graph/EXO native send when available:
  try {
    Send-MgUserMail -UserId $FromMailbox -Message @{
      subject = $subj
      body = @{ contentType = "Text"; content = "Inbound alias delivery check for $($t.Address)." }
      toRecipients = @(@{ emailAddress = @{ address = $t.Address } })
    } -ErrorAction Stop
    Write-Host "  OK Graph -> $($t.Address)"
  } catch {
    Write-Warning "  Graph send failed for $($t.Address): $_. Use OWA compose To=$($t.Address) Subject=$subj"
  }
}

Write-Host ""
Write-Host "OWA shared mailbox: https://outlook.office.com/mail/support@kecktech.net/"
Write-Host "Confirm each [TEST] subject appears in the shared Inbox."
