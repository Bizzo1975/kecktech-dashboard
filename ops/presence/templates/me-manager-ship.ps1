# ME Manager ship helper — Uncle Jon persona
# Requires: ME_MANAGER_INGEST_KEY in env (or .env next to this script's repo root)
param(
  [string]$Summary = "",
  [string]$Title = "",
  [string]$Site = "unclejon"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root ".git"))) {
  $root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*ME_MANAGER_INGEST_KEY\s*=\s*(.+)$') { $env:ME_MANAGER_INGEST_KEY = $Matches[1].Trim().Trim('"') }
    if ($_ -match '^\s*ME_MANAGER_URL\s*=\s*(.+)$') { $env:ME_MANAGER_URL = $Matches[1].Trim().Trim('"') }
  }
}

$key = $env:ME_MANAGER_INGEST_KEY
if (-not $key) { throw "ME_MANAGER_INGEST_KEY is required" }
$base = if ($env:ME_MANAGER_URL) { $env:ME_MANAGER_URL.TrimEnd('/') } else { "https://me.willworkforlunch.com" }

$repoName = Split-Path $root -Leaf
if (-not $Title) { $Title = "Update — $repoName" }
if (-not $Summary) {
  try { $Summary = (git -C $root log -1 --pretty=%s 2>$null) } catch { $Summary = "Game repo progress" }
  if (-not $Summary) { $Summary = "Game repo progress" }
}

$body = @{
  source = "cursor"
  title = $Title
  summary = $Summary
  targets = @{ site = $Site; social = $true }
  userFacing = $true
  repo = $repoName
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST -Uri "$base/api/events/ship" -Headers @{ Authorization = "Bearer $key" } -ContentType "application/json" -Body $body
Write-Host "Shipped to $Site via $base"
