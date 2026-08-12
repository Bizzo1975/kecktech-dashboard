#Requires -Version 5.1
<#
.SYNOPSIS
  Create Entra app registration for Graph Mail.Send (application permission)
  and print GRAPH_* values to paste into /opt/docker/dashboard/.env
  Does NOT touch LAN DNS.
#>
$ErrorActionPreference = "Stop"
Import-Module Microsoft.Graph.Applications -ErrorAction Stop
Import-Module Microsoft.Graph.Identity.DirectoryManagement -ErrorAction Stop

Connect-MgGraph -Scopes "Application.ReadWrite.All","AppRoleAssignment.ReadWrite.All","Directory.Read.All" -UseDeviceCode -NoWelcome

$tenantId = (Get-MgContext).TenantId
$displayName = "kecktech-contact-mailer"

$existing = Get-MgApplication -Filter "displayName eq '$displayName'" -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "App already exists: $($existing.AppId)"
  $app = $existing
} else {
  $app = New-MgApplication -DisplayName $displayName -SignInAudience AzureADMyOrg
  New-MgServicePrincipal -AppId $app.AppId | Out-Null
  Write-Host "Created app: $($app.AppId)"
}

# Mail.Send application permission
$graphSp = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
$mailSend = $graphSp.AppRoles | Where-Object { $_.Value -eq "Mail.Send" }
$sp = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'"
$has = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -ErrorAction SilentlyContinue |
  Where-Object { $_.AppRoleId -eq $mailSend.Id }
if (-not $has) {
  New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -PrincipalId $sp.Id -ResourceId $graphSp.Id -AppRoleId $mailSend.Id | Out-Null
  Write-Host "Assigned Mail.Send (grant admin consent in Entra if needed)"
}

$secret = Add-MgApplicationPassword -ApplicationId $app.Id -PasswordCredential @{ DisplayName = "mailer-$(Get-Date -Format yyyyMMdd)" }

Write-Host ""
Write-Host "Add to /opt/docker/dashboard/.env then rebuild kecktech-mailer:"
Write-Host "GRAPH_TENANT_ID=$tenantId"
Write-Host "GRAPH_CLIENT_ID=$($app.AppId)"
Write-Host "GRAPH_CLIENT_SECRET=$($secret.SecretText)"
Write-Host "GRAPH_MAILBOX=support@kecktech.net"
Write-Host "CONTACT_TO=support@kecktech.net"
Write-Host ""
Write-Host "Then: cd /opt/docker/dashboard; docker compose build kecktech-mailer; docker compose up -d kecktech-mailer"
Write-Host "Entra admin consent: https://entra.microsoft.com → App registrations → $displayName → API permissions → Grant admin consent"
