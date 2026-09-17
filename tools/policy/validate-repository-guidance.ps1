$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$manifestPath = Join-Path $repositoryRoot '.policy\guidance-manifest.json'
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw 'Missing .policy/guidance-manifest.json.'
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.policyVersion -ne '2026.08.18.1') {
    $failures.Add("Policy version mismatch: $($manifest.policyVersion)")
}

foreach ($property in $manifest.files.psobject.Properties) {
    $relativePath = $property.Name.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $candidate = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $failures.Add("Missing shared policy file: $($property.Name)")
        continue
    }
    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash.ToLowerInvariant()
    if ($actualHash -ne [string]$property.Value) {
        $failures.Add("Shared policy drift: $($property.Name)")
    }
}

foreach ($block in $manifest.managedBlocks) {
    $candidate = Join-Path $repositoryRoot ([string]$block.path)
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $failures.Add("Missing managed guide: $($block.path)")
        continue
    }
    $content = Get-Content -Raw -LiteralPath $candidate
    $pattern = "(?s)$([regex]::Escape([string]$block.begin)).*?$([regex]::Escape([string]$block.end))"
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -ne 1) {
        $failures.Add("Managed block must occur exactly once: $($block.path)")
        continue
    }
    $normalized = $matches[0].Value.Replace("`r`n", "`n")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $actualHash = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    if ($actualHash -ne [string]$block.sha256) {
        $failures.Add("Managed block drift: $($block.path)")
    }
}

foreach ($requiredPath in @('.github\CODEOWNERS', '.github\pull_request_template.md')) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $requiredPath) -PathType Leaf)) {
        $failures.Add("Missing repository governance file: $requiredPath")
    }
}

$governedFiles = @('AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md')
$governedFiles += @($manifest.files.psobject.Properties.Name)
foreach ($relativePath in $governedFiles | Select-Object -Unique) {
    $candidate = Join-Path $repositoryRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    if (Select-String -LiteralPath $candidate -Pattern '^(<<<<<<<|=======|>>>>>>>)' -Quiet) {
        $failures.Add("Unresolved conflict marker: $relativePath")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "POLICY ERROR: $_" }
    exit 1
}

Write-Output 'Repository guidance validation passed: 2026.08.18.1'
