#Requires -Version 5.1
<#
.SYNOPSIS
  Create Entra app registration for Graph Mail.Send (application permission)
  and print GRAPH_* values to paste into /opt/docker/dashboard/.env
  Uses only Microsoft.Graph.Authentication + REST (no Applications module).
  Does NOT touch LAN DNS.
#>
$ErrorActionPreference = "Stop"
Import-Module Microsoft.Graph.Authentication -ErrorAction Stop

Connect-MgGraph -Scopes "Application.ReadWrite.All","AppRoleAssignment.ReadWrite.All","Directory.Read.All" -UseDeviceCode -NoWelcome

$tenantId = (Get-MgContext).TenantId
$displayName = "kecktech-contact-mailer"

$apps = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=displayName eq '$displayName'"
if ($apps.value -and $apps.value.Count -gt 0) {
  $app = $apps.value[0]
  Write-Host "App already exists: $($app.appId)"
} else {
  $app = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/applications" -Body (@{
    displayName = $displayName
    signInAudience = "AzureADMyOrg"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "Created app: $($app.appId)"
}

# Ensure service principal exists
$sps = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '$($app.appId)'"
if (-not $sps.value -or $sps.value.Count -eq 0) {
  $sp = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/servicePrincipals" -Body (@{ appId = $app.appId } | ConvertTo-Json) -ContentType "application/json"
} else {
  $sp = $sps.value[0]
}

# Graph resource SP + Mail.Send app role
$graphSps = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '00000003-0000-0000-c000-000000000000'"
$graphSp = $graphSps.value[0]
$mailSend = $graphSp.appRoles | Where-Object { $_.value -eq "Mail.Send" }
if (-not $mailSend) { throw "Mail.Send app role not found on Microsoft Graph SP" }

$assignments = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments"
$has = $assignments.value | Where-Object { $_.appRoleId -eq $mailSend.id }
if (-not $has) {
  Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments" -Body (@{
    principalId = $sp.id
    resourceId = $graphSp.id
    appRoleId = $mailSend.id
  } | ConvertTo-Json) -ContentType "application/json" | Out-Null
  Write-Host "Assigned Mail.Send (grant admin consent in Entra if needed)"
} else {
  Write-Host "Mail.Send already assigned"
}

$secret = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)/addPassword" -Body (@{
  passwordCredential = @{ displayName = ("mailer-{0}" -f (Get-Date -Format yyyyMMdd)) }
} | ConvertTo-Json -Depth 4) -ContentType "application/json"

$outDir = $PSScriptRoot
$secretFile = Join-Path $outDir "graph-mailer.env.local"
@"
GRAPH_TENANT_ID=$tenantId
GRAPH_CLIENT_ID=$($app.appId)
GRAPH_CLIENT_SECRET=$($secret.secretText)
GRAPH_MAILBOX=support@kecktech.net
CONTACT_TO=support@kecktech.net
"@ | Set-Content -Path $secretFile -Encoding ASCII

Write-Host ""
Write-Host "Wrote $secretFile (DO NOT COMMIT)"
Write-Host "Add those vars to /opt/docker/dashboard/.env then rebuild kecktech-mailer"
Write-Host "Entra admin consent: https://entra.microsoft.com -> App registrations -> $displayName -> API permissions -> Grant admin consent"
