#Requires -Version 5.1
<#
.SYNOPSIS
  Registry-driven onboarding for a new brand domain / aliases on the shared mailbox.

.DESCRIPTION
  Reads/writes ops/email/contacts-registry.json, then walks a printable checklist:
  M365 accepted domain + aliases, Cloudflare mail RRsets only, Graph send-as,
  optional auto-reply template key, optional Listmonk list, verify test.

  Does NOT touch Unbound / AdGuard / Tailscale / website A/AAAA.

.EXAMPLE
  pwsh -File ops/email/17-onboard-domain.ps1 -Domain example.com -Primary hello@example.com -Aliases info,noreply -AutoReply

.EXAMPLE
  pwsh -File ops/email/17-onboard-domain.ps1 -FromRegistry
#>
param(
  [string]$Domain,
  [string]$Primary,
  [string[]]$Aliases = @(),
  [switch]$AutoReply,
  [switch]$Newsletter,
  [string]$NewsletterAlias,
  [switch]$FromRegistry,
  [switch]$ApplyM365,
  [switch]$EmitCloudflareOnly,
  [string]$SharedMailbox = "support@kecktech.net",
  [string]$RegistryPath = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RegistryPath) { $RegistryPath = Join-Path $here "contacts-registry.json" }

function Read-Registry {
  if (-not (Test-Path $RegistryPath)) { throw "Registry missing: $RegistryPath" }
  Get-Content $RegistryPath -Raw | ConvertFrom-Json
}

function Write-Registry($obj) {
  $json = $obj | ConvertTo-Json -Depth 8
  Set-Content -Path $RegistryPath -Value $json -Encoding UTF8
  Write-Host "Updated $RegistryPath"
}

function Ensure-DomainBlock {
  param($reg, [string]$domain, [string]$primary, [string[]]$aliases, [bool]$autoReply, [bool]$newsletter, [string]$nlAlias)
  if (-not $reg.PSObject.Properties.Name.Contains($domain)) {
    $block = [ordered]@{
      primary = $primary
      aliases = @()
      autoReply = [bool]$autoReply
    }
    $reg | Add-Member -NotePropertyName $domain -NotePropertyValue ([pscustomobject]$block)
  }
  $b = $reg.$domain
  if ($primary) { $b.primary = $primary }
  if ($null -eq $b.aliases) { $b | Add-Member -NotePropertyName aliases -NotePropertyValue @() -Force }
  foreach ($a in $aliases) {
    $full = if ($a -match "@") { $a } else { "$a@$domain" }
    if ($b.aliases -notcontains $full) { $b.aliases = @($b.aliases) + $full }
  }
  if ($autoReply) {
    if ($null -eq $b.PSObject.Properties["autoReply"]) {
      $b | Add-Member -NotePropertyName autoReply -NotePropertyValue $true
    } else { $b.autoReply = $true }
  }
  if ($newsletter) {
    $nl = if ($nlAlias) { $nlAlias } elseif ($b.primary) { $b.primary } else { "newsletter@$domain" }
    if ($null -eq $b.PSObject.Properties["newsletter"]) {
      $b | Add-Member -NotePropertyName newsletter -NotePropertyValue ([pscustomobject]@{
        from = $nl
        replyTo = $b.primary
        listmonk = $true
      })
    } else {
      $b.newsletter.from = $nl
      $b.newsletter.replyTo = $b.primary
      $b.newsletter.listmonk = $true
    }
  }
  return $reg
}

function Get-AllAliasAddresses($reg) {
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($prop in $reg.PSObject.Properties) {
    if ($prop.Name -in @("note","sharedMailbox","phone")) { continue }
    $b = $prop.Value
    if ($b.primary) { $list.Add([string]$b.primary) }
    if ($b.also) { foreach ($a in $b.also) { $list.Add([string]$a) } }
    if ($b.aliases) {
      if ($b.aliases -is [System.Management.Automation.PSCustomObject]) {
        foreach ($ap in $b.aliases.PSObject.Properties) { $list.Add([string]$ap.Value) }
      } else {
        foreach ($a in @($b.aliases)) { $list.Add([string]$a) }
      }
    }
    if ($b.newsletter -and $b.newsletter.from) { $list.Add([string]$b.newsletter.from) }
  }
  $list | Select-Object -Unique
}

function Show-Checklist {
  param($domain, $primary, $aliasList, [bool]$autoReply, [bool]$newsletter)
  Write-Host ""
  Write-Host "=== Onboard checklist: $domain ===" -ForegroundColor Cyan
  Write-Host "1. Registry — contacts-registry.json updated (this script)."
  Write-Host "2. M365 — Admin Center → Settings → Domains → Add $domain (TXT verify)."
  Write-Host "   Once AcceptedDomain exists, add aliases on $SharedMailbox:"
  foreach ($a in $aliasList) { Write-Host "     smtp:$a" }
  Write-Host "   Re-run with -ApplyM365 after domain is Verified."
  Write-Host "3. Cloudflare — mail RRsets ONLY (MX/SPF/autodiscover/DMARC)."
  Write-Host "   Pattern: ops/email/11-cloudflare-mail-cutover.sh (do not touch A/AAAA / LAN DNS)."
  Write-Host "   Re-run with -EmitCloudflareOnly to print suggested records."
  Write-Host "4. Graph — same Entra app Mail.Send; From: uses alias via shared mailbox Send As."
  Write-Host "5. Auto-reply — $(if ($autoReply) { "enabled in registry (contact forms use Graph confirmation)" } else { "skipped" })"
  Write-Host "6. Newsletter — $(if ($newsletter) { "create Listmonk list; From/Reply-To brand alias; set LISTMONK_* env" } else { "skipped" })"
  Write-Host "7. Verify — send [TEST] onboard $primary into shared mailbox; OWA:"
  Write-Host "   https://outlook.office.com/mail/$SharedMailbox/"
  Write-Host ""
}

$reg = Read-Registry

if ($FromRegistry) {
  Write-Host "Syncing ALL registry domains to M365 aliases (when -ApplyM365)..."
  $all = Get-AllAliasAddresses $reg
  Show-Checklist -domain "(all registry)" -primary $reg.sharedMailbox -aliasList $all -autoReply $true -newsletter $false
  if ($ApplyM365) {
    Import-Module ExchangeOnlineManagement
    try { Get-OrganizationConfig | Out-Null } catch {
      Connect-ExchangeOnline -UserPrincipalName "JonathanKeck@KecktechITSolutions.onmicrosoft.com" -ShowBanner:$false -DisableWAM
    }
    Set-OrganizationConfig -SendFromAliasEnabled $true
    foreach ($a in $all) {
      $d = ($a -split "@")[1]
      $accepted = Get-AcceptedDomain -Identity $d -ErrorAction SilentlyContinue
      if (-not $accepted) { Write-Warning "Domain not verified yet: $d - skip $a"; continue }
      try {
        Set-Mailbox -Identity $SharedMailbox -EmailAddresses @{ Add = "smtp:$a" }
        Write-Host "  + smtp:$a"
      } catch {
        Write-Warning "  ! $a - $($_.Exception.Message)"
      }
    }
  }
  exit 0
}

if (-not $Domain -or -not $Primary) {
  throw "Provide -Domain and -Primary, or use -FromRegistry"
}

$aliasAddrs = @()
foreach ($a in $Aliases) {
  if ($a -match "@") { $aliasAddrs += $a } else { $aliasAddrs += "$a@$Domain" }
}
if ($Newsletter) {
  $nl = if ($NewsletterAlias) { $NewsletterAlias } else { "newsletter@$Domain" }
  if ($aliasAddrs -notcontains $nl -and $Primary -ne $nl) { $aliasAddrs += $nl }
}

$reg = Ensure-DomainBlock -reg $reg -domain $Domain -primary $Primary -aliases $aliasAddrs `
  -autoReply ([bool]$AutoReply) -newsletter ([bool]$Newsletter) -nlAlias $NewsletterAlias
Write-Registry $reg

$allForDomain = @($Primary) + $aliasAddrs | Select-Object -Unique
Show-Checklist -domain $Domain -primary $Primary -aliasList $allForDomain -autoReply ([bool]$AutoReply) -newsletter ([bool]$Newsletter)

if ($EmitCloudflareOnly) {
  $mx = "kecktechitsolutions.mail.protection.outlook.com"
  Write-Host "Cloudflare mail RRsets for $Domain (apply manually or via 11-cloudflare-mail-cutover.sh):"
  Write-Host "  MX  $Domain -> $mx (priority 0)"
  Write-Host "  TXT $Domain -> v=spf1 include:spf.protection.outlook.com -all"
  Write-Host "  CNAME autodiscover.$Domain -> autodiscover.outlook.com"
  Write-Host "  TXT _dmarc.$Domain -> v=DMARC1; p=none; rua=mailto:$SharedMailbox"
}

if ($ApplyM365) {
  Import-Module ExchangeOnlineManagement
  try { Get-OrganizationConfig | Out-Null } catch {
    Connect-ExchangeOnline -UserPrincipalName "JonathanKeck@KecktechITSolutions.onmicrosoft.com" -ShowBanner:$false -DisableWAM
  }
  $accepted = Get-AcceptedDomain -Identity $Domain -ErrorAction SilentlyContinue
  if (-not $accepted) {
    Write-Warning "Accepted domain missing for $Domain. Add+verify in M365 Admin Center, then re-run -ApplyM365."
  } else {
    Set-OrganizationConfig -SendFromAliasEnabled $true
    foreach ($a in $allForDomain) {
      try {
        Set-Mailbox -Identity $SharedMailbox -EmailAddresses @{ Add = "smtp:$a" }
        Write-Host "  + smtp:$a"
      } catch {
        Write-Warning "  ! $a - $($_.Exception.Message)"
      }
    }
  }
}

if ($Newsletter) {
  Write-Host "Listmonk next steps:"
  Write-Host "  cd ops/email/listmonk  (or /opt/docker/listmonk on WWFL host)"
  Write-Host "  Copy config.toml.example → config.toml; set DB password"
  Write-Host "  docker compose up -d"
  Write-Host "  Create list for $Domain; set LISTMONK_URL / LISTMONK_API_USER / LISTMONK_API_TOKEN / LISTMONK_LIST_UUID on the site"
}

Write-Host "Done. Human gates remaining: M365 domain TXT verify + Cloudflare login if not already cut over."
