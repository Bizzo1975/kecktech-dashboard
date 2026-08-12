# Resume: app already exists; mint new secret + consent + write env.local
$ErrorActionPreference = "Stop"
$tenant = "KecktechITSolutions.onmicrosoft.com"
$tenantId = "fe3464dd-bb73-49ee-87e9-52aa23f29b3b"
$appObjectId = "1efaaaf1-2fe6-459b-92be-65e0589b08ad"
$appId = "bcbdf813-1456-4a46-b7d5-907242c6f54f"
$mailSendRoleId = "b633e1c5-b582-4b8b-8d63-6f86a0c35c8e"
$log = "F:\Github\kecktech-dashboard\ops\email\graph-mailer-setup.log"
$outEnv = "F:\Github\kecktech-dashboard\ops\email\graph-mailer.env.local"
$publicClient = "14d82eec-204b-4c2f-b7e8-296a70dab67e"

function Log($m) { $m | Out-File $log -Append; Write-Host $m }
"RESUME $(Get-Date -Format o)" | Out-File $log -Append

$dc = Invoke-RestMethod -Method POST -Uri "https://login.microsoftonline.com/$tenant/oauth2/v2.0/devicecode" -Body @{
  client_id = $publicClient
  scope     = "https://graph.microsoft.com/.default offline_access"
} -ContentType "application/x-www-form-urlencoded"

Write-Host ""
Write-Host "Open: $($dc.verification_uri)"
Write-Host "Code: $($dc.user_code)"
Write-Host "Account: JonathanKeck@KecktechITSolutions.onmicrosoft.com"
Write-Host ""
Log "DEVICE_CODE=$($dc.user_code)"

$token = $null
$deadline = (Get-Date).AddSeconds([int]$dc.expires_in)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds ([Math]::Max(5, [int]$dc.interval))
  try {
    $token = Invoke-RestMethod -Method POST -Uri "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token" -Body @{
      grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
      client_id   = $publicClient
      device_code = $dc.device_code
    } -ContentType "application/x-www-form-urlencoded"
    break
  } catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($err.error -eq "authorization_pending") { continue }
    if ($err.error -eq "slow_down") { Start-Sleep -Seconds 5; continue }
    Log "TOKEN_ERROR: $($_.ErrorDetails.Message)"
    throw
  }
}
if (-not $token.access_token) { throw "No token" }
Log "TOKEN_OK"
$headers = @{ Authorization = "Bearer $($token.access_token)"; "Content-Type" = "application/json" }

# Ensure SP
$spList = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '$appId'"
if ($spList.value.Count -eq 0) {
  $sp = Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals" -Body (@{ appId = $appId } | ConvertTo-Json)
} else { $sp = $spList.value[0] }
Log "SP_ID=$($sp.id)"

# New secret (previous secretText was lost when script crashed)
$pwd = Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/applications/$appObjectId/addPassword" -Body (@{
  passwordCredential = @{
    displayName = "mailer-$(Get-Date -Format yyyyMMddHHmm)"
    endDateTime = (Get-Date).AddYears(2).ToString("o")
  }
} | ConvertTo-Json -Depth 5)
Log "SECRET_CREATED"

# Consent (best-effort)
try {
  $graphSp = (Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '00000003-0000-0000-c000-000000000000'").value[0]
  $assigns = Invoke-RestMethod -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments"
  $has = $assigns.value | Where-Object { $_.appRoleId -eq $mailSendRoleId }
  if (-not $has) {
    Invoke-RestMethod -Method POST -Headers $headers -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments" -Body (@{
      principalId = $sp.id
      resourceId  = $graphSp.id
      appRoleId   = $mailSendRoleId
    } | ConvertTo-Json) | Out-Null
    Log "CONSENT_OK"
  } else { Log "CONSENT_EXISTS" }
} catch {
  Log "CONSENT_SKIP: $($_.ErrorDetails.Message)"
  Write-Host "Grant admin consent manually in Entra if needed."
}

# WRITE ENV FIRST so we never lose the secret again
@(
  "GRAPH_TENANT_ID=$tenantId"
  "GRAPH_CLIENT_ID=$appId"
  "GRAPH_CLIENT_SECRET=$($pwd.secretText)"
  "GRAPH_MAILBOX=support@kecktech.net"
  "CONTACT_TO=support@kecktech.net"
) | Set-Content -Path $outEnv -Encoding ascii
Log "WROTE_ENV"
Log "DONE"
Write-Host "DONE - env written. Close window."
Start-Sleep -Seconds 8
