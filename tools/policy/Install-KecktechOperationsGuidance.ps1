[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$registryPath = Join-Path $repositoryRoot 'ops\recovery\repositories.json'
$policyRepositoryPath = 'F:\Github\kecktech-infrastructure'
$distributionRoot = $policyRepositoryPath
$sourceSkill = Join-Path $distributionRoot '.agents\skills\kecktech-operations\SKILL.md'
$sourcePrompt = Join-Path $distributionRoot '.agents\skills\kecktech-operations\references\startup-prompt.md'
$repositories = (Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json).repositories

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
    '.github\workflows\kecktech-policy.yml'
)

if ($repositories.Count -ne 14) { throw "Expected 14 production-connected repositories, found $($repositories.Count)." }
$targets = @($repositories) + [pscustomobject]@{ id = 'repo-kecktech-infrastructure'; path = $policyRepositoryPath }

$begin = '<!-- BEGIN KECKTECH OPERATIONS POLICY 2026.08.18.1 -->'
$end = '<!-- END KECKTECH OPERATIONS POLICY 2026.08.18.1 -->'
$block = @"
$begin

## Kecktech operations workflow

Policy version: 2026.08.18.1  
Project instructions SHA-256: ecdbf37e53cd1d59957c928b3342104c045d87f79ccc3d181586a3aa7592a6d1  
Canonical development policy SHA-256: 943e916f42855fdcc42bf3f685c4c47106131547c629ec592748323a1e3db21d

Load `.agents/skills/kecktech-operations/SKILL.md` for infrastructure,
operations, incidents, deployment, live-to-Git reconciliation, or Notion work.
Read `PROJECT_INSTRUCTIONS.md` before planning, editing, testing, or deploying;
it is the identical universal policy in every production-connected repository.
Reuse the completed 2026-08-16 fleet audit and 2026-08-18 deployment captures;
perform only changed, contradictory, provenance-missing, or acceptance-critical
verification. Treat live production as authoritative until reconciliation is
accepted, preserve dirty work, and never overwrite live state with older Git.

While `KT-DNS-001` is active, make no DNS, router, firewall, VLAN, switch,
Proxmox-network, VM/LXC, resolver, restart, reload, or flush change without exact
separate approval. PBS remains intentionally suspended for storage constraints.
Fetch Notion immediately before each write, read it back afterward, and present
the complete Daily Handoff draft before writing it.

$end
"@

$contributingBegin = '<!-- BEGIN KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->'
$contributingEnd = '<!-- END KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->'
$contributingBlock = @"
$contributingBegin

Follow `PROJECT_INSTRUCTIONS.md`, `AGENTS.md`, and the applicable `.cursor/rules/`
files. Preserve unrelated work; define observable acceptance and rollback; add
regression coverage; run every repository-local format, lint, type, test, build,
security, and policy check. A missing check is a recorded gap, never an implied
pass. Production requires reviewed immutable delivery and post-change evidence.

$contributingEnd
"@

$securityBegin = '<!-- BEGIN KECKTECH SECURITY POLICY 2026.08.18.1 -->'
$securityEnd = '<!-- END KECKTECH SECURITY POLICY 2026.08.18.1 -->'
$securityBlock = @"
$securityBegin

Report vulnerabilities through the established private Kecktech operations
channel. Never disclose credentials, private infrastructure, client/family data,
biometric material, or production records. OWASP ASVS 5.0 Level 2 is the minimum
web baseline. Critical exploitable findings block release; high findings require
remediation or an approved expiring exception. Credential rotation and destructive
containment require the exact approvals in `PROJECT_INSTRUCTIONS.md`.

$securityEnd
"@

function Set-ManagedBlock {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $DefaultHeading,
        [Parameter(Mandatory)] [string] $Begin,
        [Parameter(Mandatory)] [string] $End,
        [Parameter(Mandatory)] [string] $Block
    )
    $existingText = if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Get-Content -LiteralPath $Path -Raw
    } else {
        "$DefaultHeading`r`n"
    }
    $pattern = "(?s)$([regex]::Escape($Begin)).*?$([regex]::Escape($End))"
    $nextText = if ($existingText -match $pattern) {
        [regex]::Replace($existingText, $pattern, $Block)
    } else {
        $existingText.TrimEnd() + "`r`n`r`n" + $Block + "`r`n"
    }
    Set-Content -LiteralPath $Path -Value $nextText -Encoding utf8NoBOM
}

foreach ($repository in $targets) {
    $path = [System.IO.Path]::GetFullPath([string]$repository.path)
    if (-not $path.StartsWith('F:\Github\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Repository is outside the approved F:\Github boundary: $path"
    }
    if (-not (Test-Path -LiteralPath $path -PathType Container)) { throw "Missing repository: $path" }
    $item = Get-Item -LiteralPath $path -Force
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Refusing reparse-point repository: $path" }

    $agentPath = Join-Path $path 'AGENTS.md'
    $skillDirectory = Join-Path $path '.agents\skills\kecktech-operations'
    $promptDirectory = Join-Path $skillDirectory 'references'
    $existing = if (Test-Path -LiteralPath $agentPath) { Get-Content -LiteralPath $agentPath -Raw } else {
        "# Kecktech Repository Instructions`r`n`r`nPolicy version: ``2026.08.18.1```r`n"
    }
    $escapedBegin = [regex]::Escape($begin)
    $escapedEnd = [regex]::Escape($end)
    $pattern = "(?s)$escapedBegin.*?$escapedEnd"
    $next = if ($existing -match $pattern) {
        [regex]::Replace($existing, $pattern, $block)
    } else {
        $existing.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
    }

    if ($PSCmdlet.ShouldProcess($path, 'Install Kecktech operations AGENTS block and skill')) {
        New-Item -ItemType Directory -Path $promptDirectory -Force | Out-Null
        Set-Content -LiteralPath $agentPath -Value $next -Encoding utf8NoBOM
        foreach ($relativeFile in $sharedFiles) {
            $source = Join-Path $distributionRoot $relativeFile
            $destination = Join-Path $path $relativeFile
            $destinationDirectory = Split-Path -Parent $destination
            New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
            if (-not [System.IO.Path]::GetFullPath($source).Equals([System.IO.Path]::GetFullPath($destination), [System.StringComparison]::OrdinalIgnoreCase)) {
                Copy-Item -LiteralPath $source -Destination $destination -Force
            }
        }
        Set-ManagedBlock -Path (Join-Path $path 'CONTRIBUTING.md') -DefaultHeading '# Contributing' -Begin $contributingBegin -End $contributingEnd -Block $contributingBlock
        Set-ManagedBlock -Path (Join-Path $path 'SECURITY.md') -DefaultHeading '# Security' -Begin $securityBegin -End $securityEnd -Block $securityBlock
        $githubDirectory = Join-Path $path '.github'
        New-Item -ItemType Directory -Path $githubDirectory -Force | Out-Null
        foreach ($relativeFile in @('.github\CODEOWNERS', '.github\pull_request_template.md')) {
            $destination = Join-Path $path $relativeFile
            if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
                Copy-Item -LiteralPath (Join-Path $distributionRoot $relativeFile) -Destination $destination
            }
        }
        $skillDestination = Join-Path $skillDirectory 'SKILL.md'
        $promptDestination = Join-Path $promptDirectory 'startup-prompt.md'
        if (-not [System.IO.Path]::GetFullPath($sourceSkill).Equals([System.IO.Path]::GetFullPath($skillDestination), [System.StringComparison]::OrdinalIgnoreCase)) {
            Copy-Item -LiteralPath $sourceSkill -Destination $skillDestination -Force
        }
        if (-not [System.IO.Path]::GetFullPath($sourcePrompt).Equals([System.IO.Path]::GetFullPath($promptDestination), [System.StringComparison]::OrdinalIgnoreCase)) {
            Copy-Item -LiteralPath $sourcePrompt -Destination $promptDestination -Force
        }
    }
}

Write-Output "Kecktech operations guidance processed for $($repositories.Count) production-connected repositories plus the canonical policy repository."
