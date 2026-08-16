# Raw device-code + Graph REST — avoids Connect-MgGraph ETW "listener" crash.
# Sign in as: JonathanKeck@KecktechITSolutions.onmicrosoft.com
$ErrorActionPreference = "Stop"
$tenant = "KecktechITSolutions.onmicrosoft.com"
$log = "F:\Github\kecktech-dashboard\ops\email\graph-mailer-setup.log"
$outEnv = "F:\Github\kecktech-dashboard\ops\email\graph-mailer.env.local"
$clientId = "14d82eec-204b-4c2f-b7e8-296a70dab67e" # Microsoft Graph PowerShell public client
$scope = "https://graph.microsoft.com/.default offline_access"

function Log($m) { $m | Out-File $log -Append; Write-Host $m }

"START $(Get-Date -Format o)" | Out-File $log
Log "Requesting device code for tenant $tenant ..."

$dcBody = @{
  client_id = $clientId
  scope     = $scope
}
$dc = Invoke-RestMethod -Method POST -Uri "https://login.microsoftonline.com/$tenant/oauth2/v2.0/devicecode" -Body $dcBody -ContentType "application/x-www-form-urlencoded"
Write-Host ""
Write-Host "=============================================="
Write-Host " Open: $($dc.verification_uri)"
Write-Host " Code: $($dc.user_code)"
Write-Host " Account: JonathanKeck@KecktechITSolutions.onmicrosoft.com"
Write-Host "=============================================="
Write-Host ""
Log "DEVICE_CODE=$($dc.user_code)"

$token = $null
$deadline = (Get-Date).AddSeconds([int]$dc.expires_in)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds ([Math]::Max(5, [int]$dc.interval))
  try {
    $token = Invoke-RestMethod -Method POST -Uri "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token" -Body @{
      grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
      client_id   = $clientId
      device_code = $dc.device_code
    } -ContentType "application/x-www-form-urlencoded"
    break
  } catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($err.error -eq "authorization_pending") { continue }
    if ($err.error -eq "slow_down") { Start-Sleep -Seconds 5; continue }
    Log "TOKEN_ERROR: $($_.Exception.Message) $($_.ErrorDetails.Message)"
    throw
  }
}
if (-not $token.access_token) { throw "No access token (timed out or denied)" }
Log "TOKEN_OK"

$headers = @{ Authorization = "Bearer $($token.access_token)"; "Content-Type" = "application/json" }
$me = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/me"
Log "SIGNED_IN=$($me.userPrincipalName)"

# Resolve tenant id from token claims (mid of JWT is base64 payload)
$payload = $token.access_token.Split('.')[1]
$pad = 4 - ($payload.Length % 4); if ($pad -lt 4) { $payload += ("=" * $pad) }
$claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-','+').Replace('_','/'))) | ConvertFrom-Json
$tenantId = $claims.tid
Log "TENANT_ID=$tenantId"

$displayName = "kecktech-contact-mailer"
$existing = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=displayName eq '$displayName'"
$mailSendRoleId = "b633e1c5-b582-4b8b-8d63-6f86a0c35c8e" # Mail.Send application permission on Microsoft Graph

if ($existing.value.Count -gt 0) {
  $app = $existing.value[0]
  Log "REUSED appId=$($app.appId) objectId=$($app.id)"
  $body = @{
    requiredResourceAccess = @(
      @{
        resourceAppId  = "00000003-0000-0000-c000-000000000000"
        resourceAccess  = @(@{ id = $mailSendRoleId; type = "Role" })
      }
    )
  } | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Method PATCH -Headers $headers -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)" -Body $body | Out-Null
} else {
  $create = @{
    displayName = $displayName
    signInAudience = "AzureADMyOrg"
    requiredResourceAccess = @(
      @{
        resourceAppId  = "00000003-0000-0000-c000-000000000000"
        resourceAccess  = @(@{ id = $mailSendRoleId; type = "Role" })
      }
    )
  } | ConvertTo-Json -Depth 6
  $app = Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/applications" -Body $create
  Log "CREATED appId=$($app.appId) objectId=$($app.id)"
}

# Ensure service principal
$spList = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '$($app.appId)'"
if ($spList.value.Count -eq 0) {
  $sp = Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals" -Body (@{ appId = $app.appId } | ConvertTo-Json)
  Log "SP_CREATED"
} else {
  $sp = $spList.value[0]
  Log "SP_EXISTS"
}

# Client secret
$pwdBody = @{
  passwordCredential = @{
    displayName = "mailer-$(Get-Date -Format yyyyMMddHHmm)"
    endDateTime = (Get-Date).AddYears(2).ToString("o")
  }
} | ConvertTo-Json -Depth 5
$pwd = Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)/addPassword" -Body $pwdBody
Log "SECRET_CREATED"

# Admin consent: assign Mail.Send app role
$graphSp = (Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '00000003-0000-0000-c000-000000000000'").value[0]
$assigns = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments"
$has = $assigns.value | Where-Object { $_.appRoleId -eq $mailSendRoleId }
if (-not $has) {
  $assignBody = @{
    principalId = $sp.id
    resourceId  = $graphSp.id
    appRoleId   = $mailSendRoleId
  } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments" -Body $assignBody | Out-Null
  Log "CONSENT_OK"
} else {
  Log "CONSENT_EXISTS"
}

@(
  "GRAPH_TENANT_ID=$tenantId"
  "GRAPH_CLIENT_ID=$($app.appId)"
  "GRAPH_CLIENT_SECRET=$($pwd.secretText)"
  "GRAPH_MAILBOX=support@kecktech.net"
  "CONTACT_TO=support@kecktech.net"
) | Set-Content -Path $outEnv -Encoding ascii

Log "DONE"
Write-Host "DONE - secrets saved. Close this window."
Start-Sleep -Seconds 10
