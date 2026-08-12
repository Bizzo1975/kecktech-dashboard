#Requires -Version 5.1
<#
.SYNOPSIS
  Send one Graph test message into the shared mailbox per registry alias.
  Uses DELEGATED Graph (device login) - does not create an Entra app.
  Does NOT touch LAN DNS / Unbound / AdGuard / Tailscale.
#>
param(
  [string]$SharedMailbox = "support@kecktech.net",
  [string]$RegistryPath = "$PSScriptRoot\contacts-registry.json"
)

$ErrorActionPreference = "Stop"
Import-Module Microsoft.Graph.Authentication -ErrorAction Stop

Write-Host "Device login required (Mail.Send, Mail.ReadWrite)..."
Connect-MgGraph -Scopes "Mail.Send","Mail.ReadWrite","User.Read" -UseDeviceCode -NoWelcome

$reg = Get-Content $RegistryPath -Raw | ConvertFrom-Json
$aliases = New-Object System.Collections.Generic.List[string]
$aliases.Add($reg.sharedMailbox)
foreach ($k in $reg.'kecktech.net'.aliases.PSObject.Properties) { $aliases.Add([string]$k.Value) }
foreach ($a in @($reg.'willworkforlunch.com'.primary) + @($reg.'willworkforlunch.com'.also)) {
  if ($a) { $aliases.Add([string]$a) }
}
$aliases.Add([string]$reg.'jacob-roman.com'.primary)
$aliases.Add([string]$reg.'unclejonsitgarage.com'.primary)
@(
  "hello@kecktech.net","contact@kecktech.net","noreply@kecktech.net","sovereign@kecktech.net",
  "noreply@willworkforlunch.com","info@jacob-roman.com",
  "info@unclejonsitgarage.com","noreply@unclejonsitgarage.com"
) | ForEach-Object { $aliases.Add($_) }

$unique = $aliases | Sort-Object -Unique
Write-Host ("Sending {0} tests to {1} ..." -f $unique.Count, $SharedMailbox)

foreach ($fromAlias in $unique) {
  $subject = "[TEST] site-mail $fromAlias"
  $body = "Automated cutover proof.`nFromAlias: $fromAlias`nTo: $SharedMailbox`nTime: $(Get-Date -Format o)"
  $payloadObj = @{
    message = @{
      subject = $subject
      body = @{ contentType = "Text"; content = $body }
      toRecipients = @(@{ emailAddress = @{ address = $SharedMailbox } })
      from = @{ emailAddress = @{ address = $fromAlias } }
    }
    saveToSentItems = $true
  }
  $payload = $payloadObj | ConvertTo-Json -Depth 8

  try {
    $uri = "https://graph.microsoft.com/v1.0/users/$([uri]::EscapeDataString($SharedMailbox))/sendMail"
    Invoke-MgGraphRequest -Method POST -Uri $uri -Body $payload -ContentType "application/json"
    Write-Host "  OK $fromAlias"
  } catch {
    Write-Warning ("  FAIL {0} - {1}" -f $fromAlias, $_.Exception.Message)
  }
}

Write-Host ""
Write-Host ("Open: https://outlook.office.com/mail/{0}/" -f $SharedMailbox)
Write-Host 'Filter inbox subject starts with [TEST]'
