$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$repositories = (Get-Content -LiteralPath (Join-Path $repositoryRoot 'ops\recovery\repositories.json') -Raw | ConvertFrom-Json).repositories
$policyRepositoryPath = 'F:\Github\kecktech-infrastructure'
$targets = @($repositories) + [pscustomobject]@{ id = 'repo-kecktech-infrastructure'; path = $policyRepositoryPath }
$failures = [System.Collections.Generic.List[string]]::new()
$sharedFiles = @(
    'PROJECT_INSTRUCTIONS.md',
    '.cursor\rules\api-data.mdc',
    '.cursor\rules\containers-deployment.mdc',
    '.cursor\rules\kecktech-operations.mdc',
    '.cursor\rules\operations-scripts.mdc',
    '.cursor\rules\typescript-web.mdc',
    '.policy\guidance-manifest.json',
    'tools\policy\validate-repository-guidance.ps1',
    'tools\policy\test-repository-guidance.ps1',
    '.github\workflows\kecktech-policy.yml',
    '.agents\skills\kecktech-operations\SKILL.md',
    '.agents\skills\kecktech-operations\references\startup-prompt.md'
)
$expectedHashes = @{}
foreach ($relativeFile in $sharedFiles) {
    $expectedHashes[$relativeFile] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $policyRepositoryPath $relativeFile)).Hash
}

function Get-ManagedBlock {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $Begin,
        [Parameter(Mandatory)] [string] $End
    )
    $content = Get-Content -LiteralPath $Path -Raw
    $matches = [regex]::Matches($content, "(?s)$([regex]::Escape($Begin)).*?$([regex]::Escape($End))")
    if ($matches.Count -ne 1) { return $null }
    return $matches[0].Value.Replace("`r`n", "`n")
}

$managedBlocks = @(
    @{ Path = 'AGENTS.md'; Begin = '<!-- BEGIN KECKTECH OPERATIONS POLICY 2026.08.18.1 -->'; End = '<!-- END KECKTECH OPERATIONS POLICY 2026.08.18.1 -->' },
    @{ Path = 'CONTRIBUTING.md'; Begin = '<!-- BEGIN KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->'; End = '<!-- END KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->' },
    @{ Path = 'SECURITY.md'; Begin = '<!-- BEGIN KECKTECH SECURITY POLICY 2026.08.18.1 -->'; End = '<!-- END KECKTECH SECURITY POLICY 2026.08.18.1 -->' }
)
$expectedBlocks = @{}
foreach ($managedBlock in $managedBlocks) {
    $expectedBlocks[$managedBlock.Path] = Get-ManagedBlock -Path (Join-Path $policyRepositoryPath $managedBlock.Path) -Begin $managedBlock.Begin -End $managedBlock.End
    if ($null -eq $expectedBlocks[$managedBlock.Path]) { throw "Canonical managed block is missing or duplicated: $($managedBlock.Path)" }
}

foreach ($repository in $targets) {
    $path = [System.IO.Path]::GetFullPath([string]$repository.path)
    $required = @(
        (Join-Path $path 'AGENTS.md'),
        (Join-Path $path 'PROJECT_INSTRUCTIONS.md'),
        (Join-Path $path 'CONTRIBUTING.md'),
        (Join-Path $path 'SECURITY.md'),
        (Join-Path $path '.github\CODEOWNERS'),
        (Join-Path $path '.github\pull_request_template.md'),
        (Join-Path $path '.agents\skills\kecktech-operations\SKILL.md'),
        (Join-Path $path '.agents\skills\kecktech-operations\references\startup-prompt.md')
    )
    foreach ($file in $required) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $failures.Add("Missing: $file") }
    }
    if (Test-Path -LiteralPath $required[0]) {
        $agentText = Get-Content -LiteralPath $required[0] -Raw
        foreach ($token in @('2026.08.18.1', 'PROJECT_INSTRUCTIONS.md', 'KT-DNS-001', 'Daily Handoff')) {
            if ($agentText -notmatch [regex]::Escape($token)) { $failures.Add("AGENTS.md missing '$token': $path") }
        }
    }
    $skillPath = Join-Path $path '.agents\skills\kecktech-operations\SKILL.md'
    if (Test-Path -LiteralPath $skillPath) {
        $skillText = Get-Content -LiteralPath $skillPath -Raw
        foreach ($token in @('name: kecktech-operations', 'Policy version: 2026.08.18.1', '2026-08-16 fleet audit', '2026-08-18 deployment captures')) {
            if ($skillText -notmatch [regex]::Escape($token)) { $failures.Add("Skill missing '$token': $path") }
        }
    }
    foreach ($relativeFile in $sharedFiles) {
        $candidate = Join-Path $path $relativeFile
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash
            if ($actualHash -ne $expectedHashes[$relativeFile]) {
                $failures.Add("Shared policy drift: $candidate")
            }
        }
    }
    foreach ($guide in @(
        @{ Path = 'CONTRIBUTING.md'; Token = 'BEGIN KECKTECH CONTRIBUTING POLICY 2026.08.18.1' },
        @{ Path = 'SECURITY.md'; Token = 'BEGIN KECKTECH SECURITY POLICY 2026.08.18.1' }
    )) {
        $candidate = Join-Path $path $guide.Path
        if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and -not (Select-String -LiteralPath $candidate -SimpleMatch $guide.Token -Quiet)) {
            $failures.Add("Managed guide block missing: $candidate")
        }
    }
    foreach ($managedBlock in $managedBlocks) {
        $candidate = Join-Path $path $managedBlock.Path
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $actualBlock = Get-ManagedBlock -Path $candidate -Begin $managedBlock.Begin -End $managedBlock.End
            if ($null -eq $actualBlock) {
                $failures.Add("Managed block is missing or duplicated: $candidate")
            } elseif ($actualBlock -ne $expectedBlocks[$managedBlock.Path]) {
                $failures.Add("Managed block drift: $candidate")
            }
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "Fleet guidance validation passed: $($repositories.Count) production-connected repositories plus the canonical policy repository."
