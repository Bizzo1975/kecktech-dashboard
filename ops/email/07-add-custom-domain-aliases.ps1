#Requires -Version 5.1
<#
.SYNOPSIS
  After custom domains are verified in M365 Admin Center, add aliases and
  optionally promote support@kecktech.net to primary SMTP.

.NOTES
  DEPRECATED pattern: hardcoded $aliases array below.
  Prefer registry-driven: ops/email/17-onboard-domain.ps1 -FromRegistry -ApplyM365
  or -Domain / -Primary / -Aliases for a single new domain.
#>
param(
  [string]$SharedMailbox = "support@KecktechITSolutions.onmicrosoft.com",
  [string]$NewPrimary = "support@kecktech.net",
  [switch]$SetPrimaryToKecktech
)
Write-Warning "07-add-custom-domain-aliases.ps1 is legacy. Prefer ops/email/17-onboard-domain.ps1 (contacts-registry.json)."

$ErrorActionPreference = "Stop"
Import-Module ExchangeOnlineManagement

try { Get-OrganizationConfig | Out-Null } catch {
  Connect-ExchangeOnline -UserPrincipalName "JonathanKeck@KecktechITSolutions.onmicrosoft.com" -ShowBanner:$false -DisableWAM
}

Set-OrganizationConfig -SendFromAliasEnabled $true

$aliases = @(
  "smtp:support@kecktech.net",
  "smtp:info@kecktech.net",
  "smtp:hello@kecktech.net",
  "smtp:contact@kecktech.net",
  "smtp:sales@kecktech.net",
  "smtp:billing@kecktech.net",
  "smtp:privacy@kecktech.net",
  "smtp:noreply@kecktech.net",
  "smtp:help@kecktech.net",
  "smtp:portal@kecktech.net",
  "smtp:hosting@kecktech.net",
  "smtp:wiki@kecktech.net",
  "smtp:marketlist@kecktech.net",
  "smtp:flooros@kecktech.net",
  "smtp:farmbot@kecktech.net",
  "smtp:cleaner@kecktech.net",
  "smtp:argo@kecktech.net",
  "smtp:netops@kecktech.net",
  "smtp:chat@kecktech.net",
  "smtp:hub@kecktech.net",
  "smtp:sovereign@kecktech.net",
  "smtp:hello@willworkforlunch.com",
  "smtp:jon@willworkforlunch.com",
  "smtp:info@willworkforlunch.com",
  "smtp:noreply@willworkforlunch.com",
  "smtp:privacy@willworkforlunch.com",
  "smtp:hello@jacob-roman.com",
  "smtp:info@jacob-roman.com",
  "smtp:support@unclejonsitgarage.com",
  "smtp:info@unclejonsitgarage.com",
  "smtp:noreply@unclejonsitgarage.com"
)

Write-Host "Accepted domains:"
Get-AcceptedDomain | Format-Table DomainName, DomainType, Default -AutoSize

foreach ($a in $aliases) {
  $domain = ($a -replace '^smtp:[^@]+@','')
  $accepted = Get-AcceptedDomain -Identity $domain -ErrorAction SilentlyContinue
  if (-not $accepted) {
    Write-Warning "Domain not verified yet: $domain - skip $a"
    continue
  }
  try {
    Set-Mailbox -Identity $SharedMailbox -EmailAddresses @{Add = $a }
    Write-Host "  + $a"
  } catch {
    Write-Warning "  ! $a - $($_.Exception.Message)"
  }
}

if ($SetPrimaryToKecktech) {
  $ok = Get-AcceptedDomain -Identity "kecktech.net" -ErrorAction SilentlyContinue
  if (-not $ok) { throw "kecktech.net not verified - cannot set primary" }
  Write-Host "Setting primary SMTP to $NewPrimary ..."
  Set-Mailbox -Identity $SharedMailbox -WindowsEmailAddress $NewPrimary
}

Write-Host ""
Write-Host "Current addresses:"
(Get-Mailbox -Identity $SharedMailbox).EmailAddresses
