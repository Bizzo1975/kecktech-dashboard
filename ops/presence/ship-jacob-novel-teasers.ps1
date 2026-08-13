<#
.SYNOPSIS
  Ships Jacob Roman novel concept teasers to ME Manager as drafts.

.DESCRIPTION
  Reads each markdown file in ./jacob-teasers (YAML frontmatter: title, summary, slug)
  and POSTs it to POST /api/events/ship on ME Manager.

  Drafts only. A healthy ship lands the package at "awaiting_approval"; site and
  social drafts then wait for Approve in the ME Manager Pipeline/Inbox. Nothing is
  ever auto-published - do not add an auto-publish or auto-approve flag here.
  Any package reported at another status (e.g. "site_drafted") stalled mid-pipeline
  and is not in the Inbox yet; the script warns when that happens.

  The ingest key is read from $env:ME_MANAGER_INGEST_KEY, or from
  F:/Github/me-manager/.env when the env var is not set. The key is never printed.

.PARAMETER Slug
  Optional. Ship only the teaser whose filename (without .md) matches this value.

.PARAMETER WhatIfOnly
  Build and validate the payloads, print what would be sent, and exit without POSTing.

.PARAMETER RetrySuffix
  Appended to each sourceRef. ME Manager dedupes on sourceRef, so a re-run after a
  failed ship returns the stalled package instead of reprocessing it. Pass a suffix
  (e.g. -RetrySuffix r2) to force a fresh package once the cause is fixed.

.EXAMPLE
  ./ship-jacob-novel-teasers.ps1
  ./ship-jacob-novel-teasers.ps1 -Slug the-quiet-field
  ./ship-jacob-novel-teasers.ps1 -WhatIfOnly
  ./ship-jacob-novel-teasers.ps1 -RetrySuffix r2
#>
[CmdletBinding()]
param(
  [string]$Slug = "",
  [string]$TeaserDir = "",
  [string]$EnvFile = "F:/Github/me-manager/.env",
  [string]$RetrySuffix = "",
  [switch]$WhatIfOnly
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $TeaserDir) { $TeaserDir = Join-Path $scriptDir "jacob-teasers" }

function Get-IngestKey {
  param([string]$EnvFilePath)

  if ($env:ME_MANAGER_INGEST_KEY) {
    return @{ Key = $env:ME_MANAGER_INGEST_KEY; Origin = "environment" }
  }

  if (Test-Path -LiteralPath $EnvFilePath) {
    foreach ($line in Get-Content -LiteralPath $EnvFilePath) {
      if ($line -match '^\s*(?:export\s+)?ME_MANAGER_INGEST_KEY\s*=\s*(.+)$') {
        $value = $Matches[1].Trim().Trim('"').Trim("'")
        if ($value) { return @{ Key = $value; Origin = "env file" } }
      }
    }
  }

  return $null
}

function Get-BaseUrl {
  param([string]$EnvFilePath)

  if ($env:ME_MANAGER_URL) { return $env:ME_MANAGER_URL.TrimEnd('/') }

  if (Test-Path -LiteralPath $EnvFilePath) {
    foreach ($line in Get-Content -LiteralPath $EnvFilePath) {
      if ($line -match '^\s*(?:export\s+)?ME_MANAGER_URL\s*=\s*(.+)$') {
        $value = $Matches[1].Trim().Trim('"').Trim("'")
        if ($value) { return $value.TrimEnd('/') }
      }
    }
  }

  return "https://me.willworkforlunch.com"
}

function Read-Teaser {
  param([System.IO.FileInfo]$File)

  # Explicit UTF-8 read: Windows PowerShell 5.1 would otherwise mangle em dashes and quotes.
  $raw = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
  $match = [regex]::Match($raw, '(?s)^\s*---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$')
  if (-not $match.Success) {
    throw "$($File.Name): missing YAML frontmatter block"
  }

  $meta = @{}
  foreach ($line in ($match.Groups[1].Value -split "\r?\n")) {
    if ($line -match '^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$') {
      $meta[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }

  $content = $match.Groups[2].Value.Trim()

  foreach ($field in @("title", "summary", "slug")) {
    if (-not $meta[$field]) { throw "$($File.Name): frontmatter is missing '$field'" }
  }
  if (-not $content) { throw "$($File.Name): teaser body is empty" }

  return [pscustomobject]@{
    File    = $File.Name
    Title   = $meta["title"]
    Summary = $meta["summary"]
    Slug    = $meta["slug"]
    Content = $content
  }
}

if (-not (Test-Path -LiteralPath $TeaserDir)) {
  throw "Teaser directory not found: $TeaserDir"
}

$files = Get-ChildItem -LiteralPath $TeaserDir -Filter "*.md" -File | Sort-Object Name
if ($Slug) {
  $files = $files | Where-Object { $_.BaseName -eq $Slug }
  if (-not $files) { throw "No teaser file matches slug '$Slug' in $TeaserDir" }
}
if (-not $files) { throw "No teaser markdown files found in $TeaserDir" }

$teasers = @(foreach ($file in $files) { Read-Teaser -File $file })

$base = Get-BaseUrl -EnvFilePath $EnvFile
Write-Host "ME Manager: $base"
Write-Host "Teasers:    $($teasers.Count) ($TeaserDir)"

if ($WhatIfOnly) {
  foreach ($teaser in $teasers) {
    Write-Host "  would ship [$($teaser.Slug)] $($teaser.Title) - $($teaser.Content.Length) chars"
  }
  Write-Host "WhatIfOnly - nothing sent."
  return
}

$auth = Get-IngestKey -EnvFilePath $EnvFile
if (-not $auth) {
  throw "ME_MANAGER_INGEST_KEY not found in environment or $EnvFile. Set it and re-run; teasers are ready to ship."
}
Write-Host "Auth key:   loaded from $($auth.Origin)"

$headers = @{ Authorization = "Bearer $($auth.Key)" }
$failures = 0
$stalled = 0

foreach ($teaser in $teasers) {
  $payload = [ordered]@{
    title      = $teaser.Title
    summary    = $teaser.Summary
    content    = $teaser.Content
    changelog  = $teaser.Content
    source     = "lost-in-thought"
    sourceRef  = "jacob-teaser-$($teaser.Slug)$(if ($RetrySuffix) { "-$RetrySuffix" })"
    userFacing = $true
    targets    = [ordered]@{ site = "jacob-roman"; social = $false }
  }

  $body = [System.Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 6))

  try {
    $response = Invoke-RestMethod -Method POST -Uri "$base/api/events/ship" `
      -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
    $status = if ($response.status) { $response.status } else { "unknown" }
    $note = if ($response.deduped) { " (deduped - existing package)" } else { "" }
    Write-Host "  OK   [$($teaser.Slug)] package=$($response.packageId) status=$status$note"
    if ($status -ne "awaiting_approval") {
      $stalled++
      Write-Warning "       [$($teaser.Slug)] stalled at '$status' - package exists but is not in the Inbox yet."
    }
  }
  catch {
    $failures++
    $detail = $_.Exception.Message
    $response = $_.Exception.Response
    if ($response) {
      $detail = "HTTP $([int]$response.StatusCode)"
      try {
        $stream = $response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $payloadText = $reader.ReadToEnd()
          $reader.Dispose()
          if ($payloadText) { $detail = "$detail $payloadText" }
        }
      }
      catch { }
    }
    Write-Warning "  FAIL [$($teaser.Slug)] $detail"
  }
}

if ($failures -gt 0) {
  throw "$failures of $($teasers.Count) teasers failed to ship. Fix, then re-run with -RetrySuffix (sourceRef dedupe blocks a plain re-run)."
}

if ($stalled -gt 0) {
  Write-Host ""
  Write-Warning "$stalled of $($teasers.Count) packages are not at awaiting_approval."
  Write-Warning "Usual cause: ME Manager's LLM backend (GPU broker / Ollama) failed during draft generation."
  Write-Warning "Fix the backend, then either use Regenerate blog in the Inbox or re-run with -RetrySuffix."
  return
}

Write-Host ""
Write-Host "All teasers shipped as drafts. Approve in ME Manager Pipeline -> Inbox (jacob-roman)."
Write-Host "Nothing was published; drafts remain at awaiting_approval."
