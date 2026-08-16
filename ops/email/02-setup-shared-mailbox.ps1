#Requires -Version 5.1
<#
.SYNOPSIS
  Creates the shared mailbox, adds per-app/multi-domain aliases, enables Send-from-alias.
.NOTES
  Run after Business Basic is purchased and you are signed in as Exchange admin.
  Install module once: Install-Module ExchangeOnlineManagement -Scope CurrentUser
#>

param(
  [string]$SharedDisplayName = "Kecktech Contact",
  [string]$PrimarySmtp = "support@KecktechITSolutions.onmicrosoft.com",
  [string]$MemberUpn = "JonathanKeck@KecktechITSolutions.onmicrosoft.com"
)

$ErrorActionPreference = "Stop"

Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline

Write-Host "Enabling SendFromAliasEnabled organization-wide..."
Set-OrganizationConfig -SendFromAliasEnabled $true

$existing = Get-Mailbox -Identity $PrimarySmtp -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "Creating shared mailbox $PrimarySmtp ..."
  New-Mailbox -Shared -Name $SharedDisplayName -DisplayName $SharedDisplayName -PrimarySmtpAddress $PrimarySmtp
} else {
  Write-Host "Shared mailbox already exists: $PrimarySmtp"
}

$aliases = @(
  # Company catch-alls
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
  # Per-app
  "smtp:marketlist@kecktech.net",
  "smtp:flooros@kecktech.net",
  "smtp:farmbot@kecktech.net",
  "smtp:cleaner@kecktech.net",
  "smtp:argo@kecktech.net",
  "smtp:netops@kecktech.net",
  "smtp:chat@kecktech.net",
  "smtp:hub@kecktech.net",
  "smtp:sovereign@kecktech.net",
  # Other brands
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

Write-Host "Adding aliases (domains must already be verified in M365)..."
foreach ($a in $aliases) {
  try {
    Set-Mailbox -Identity $PrimarySmtp -EmailAddresses @{Add = $a }
    Write-Host "  + $a"
  } catch {
    Write-Warning "  ! $a — $($_.Exception.Message)"
  }
}

if ($MemberUpn) {
  Write-Host "Granting Full Access + Send As to $MemberUpn ..."
  Add-MailboxPermission -Identity $PrimarySmtp -User $MemberUpn -AccessRights FullAccess -InheritanceType All -AutoMapping $true
  Add-RecipientPermission -Identity $PrimarySmtp -Trustee $MemberUpn -AccessRights SendAs -Confirm:$false
}

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  1. Verify domains + DNS (03-dns-records.md)"
Write-Host "  2. In OWA as the shared mailbox: Settings > Mail > Compose and reply > Addresses to send from"
Write-Host "  3. Wait up to 60 minutes for SendFromAliasEnabled propagation"
Disconnect-ExchangeOnline -Confirm:$false
