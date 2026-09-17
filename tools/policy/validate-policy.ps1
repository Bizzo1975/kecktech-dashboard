$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$required = @(
    'AGENTS.md',
    'PROJECT_INSTRUCTIONS.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    '.policy\policy.json',
    '.policy\policy.schema.json',
    '.github\pull_request_template.md',
    '.cursor\rules\kecktech-operations.mdc',
    '.agents\skills\kecktech-operations\SKILL.md',
    '.agents\skills\kecktech-operations\references\startup-prompt.md',
    'tools\deployment\release-evidence.schema.json',
    'tools\deployment\assert-release-evidence.ps1',
    'tools\deployment\test-release-evidence.ps1'
)

$errors = [System.Collections.Generic.List[string]]::new()
foreach ($relativePath in $required) {
    $candidate = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $errors.Add("Missing required policy file: $relativePath")
    }
}

$policyPath = Join-Path $repoRoot '.policy\policy.json'
if (Test-Path -LiteralPath $policyPath -PathType Leaf) {
    $policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    if ($policy.policyVersion -ne '2026.08.18.1') {
        $errors.Add("Policy version must be 2026.08.18.1, found $($policy.policyVersion)")
    }
    $projectPolicyPath = Join-Path $repoRoot $policy.projectPolicy
    if (Test-Path -LiteralPath $projectPolicyPath -PathType Leaf) {
        $actualPolicyHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $projectPolicyPath).Hash.ToLowerInvariant()
        if ($actualPolicyHash -ne $policy.projectPolicySha256) {
            $errors.Add("Project policy checksum mismatch. Expected $($policy.projectPolicySha256), found $actualPolicyHash")
        }
    }
}

$exceptionsPath = Join-Path $repoRoot '.policy\exceptions'
if (Test-Path -LiteralPath $exceptionsPath -PathType Container) {
    $today = [DateTime]::UtcNow.Date
    Get-ChildItem -LiteralPath $exceptionsPath -Filter '*.json' -File | ForEach-Object {
        $exceptionFile = $_
        try {
            $exception = Get-Content -LiteralPath $exceptionFile.FullName -Raw | ConvertFrom-Json
            foreach ($field in @('rule','service','justification','risk','compensatingControls','tests','owner','approver','created','expires','remediationDue')) {
                if ($null -eq $exception.$field -or [string]::IsNullOrWhiteSpace([string]$exception.$field)) {
                    $errors.Add("$($exceptionFile.Name) is missing exception field: $field")
                }
            }
            if ([DateTime]::Parse($exception.expires).Date -lt $today) {
                $errors.Add("Expired policy exception: $($exceptionFile.Name)")
            }
        } catch {
            $errors.Add("Invalid policy exception $($exceptionFile.Name): $($_.Exception.Message)")
        }
    }
}

$prohibited = @(
    @{ Path = 'dashboard\Dockerfile'; Pattern = 'NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0'; Message = 'Global TLS verification disablement is prohibited.' },
    @{ Path = 'dashboard\docker-compose.yml'; Pattern = '^\s*image:\s*[^#\r\n]+:latest\s*$'; Message = 'Production image tags must be immutable, not latest.' }
)
foreach ($rule in $prohibited) {
    $target = Join-Path $repoRoot $rule.Path
    if ((Test-Path -LiteralPath $target -PathType Leaf) -and (Select-String -LiteralPath $target -Pattern $rule.Pattern -Quiet)) {
        $errors.Add("$($rule.Message) File: $($rule.Path)")
    }
}

$dockerfilePath = Join-Path $repoRoot 'dashboard\Dockerfile'
if (Test-Path -LiteralPath $dockerfilePath -PathType Leaf) {
    $unpinnedBase = Select-String -LiteralPath $dockerfilePath -Pattern '^\s*FROM\s+[^\s@]+(?=\s|$)' | Where-Object { $_.Line -notmatch '@sha256:[a-fA-F0-9]{64}(?:\s+AS\s+\S+)?\s*$' }
    if ($unpinnedBase) {
        $errors.Add('Every Dockerfile base image must be pinned by SHA-256 digest.')
    }
}

$composePath = Join-Path $repoRoot 'dashboard\docker-compose.yml'
if (Test-Path -LiteralPath $composePath -PathType Leaf) {
    $imageLines = Select-String -LiteralPath $composePath -Pattern '^\s*image:\s*(?<reference>[^#\r\n]+?)\s*$'
    foreach ($imageLine in $imageLines) {
        $reference = $imageLine.Matches[0].Groups['reference'].Value.Trim()
        $isPinnedLiteral = $reference -match '@sha256:[a-fA-F0-9]{64}$'
        $isRequiredReleaseInput = $reference -match '^\$\{[A-Z][A-Z0-9_]*_IMAGE:\?[^}]+\}$'
        if (-not ($isPinnedLiteral -or $isRequiredReleaseInput)) {
            $errors.Add("Compose image must be a pinned digest or required release input. Line $($imageLine.LineNumber).")
        }
    }
}

$dashboardLock = Join-Path $repoRoot 'dashboard\package-lock.json'
if (-not (Test-Path -LiteralPath $dashboardLock -PathType Leaf)) {
    $errors.Add('dashboard/package-lock.json is required for deterministic installation.')
}

$agentsPath = Join-Path $repoRoot 'AGENTS.md'
if (-not (Select-String -LiteralPath $agentsPath -Pattern '943e916f42855fdcc42bf3f685c4c47106131547c629ec592748323a1e3db21d' -Quiet)) {
    $errors.Add('Canonical development policy checksum mismatch in AGENTS.md.')
}

$operationsSkillPath = Join-Path $repoRoot '.agents\skills\kecktech-operations\SKILL.md'
if (Test-Path -LiteralPath $operationsSkillPath -PathType Leaf) {
    $skillContent = Get-Content -Raw -LiteralPath $operationsSkillPath
    foreach ($requiredText in @(
        'Policy version: 2026.08.18.1',
        'Reuse the completed 2026-08-16 fleet audit and 2026-08-18 deployment captures',
        'KT-DNS-001',
        'Present the complete Daily Handoff draft'
    )) {
        if (-not $skillContent.Contains($requiredText)) {
            $errors.Add("Kecktech operations skill is missing required control: $requiredText")
        }
    }
}

foreach ($documentationPath in @(
    'AGENTS.md',
    'PROJECT_INSTRUCTIONS.md',
    '.agents\skills\kecktech-operations\SKILL.md',
    '.agents\skills\kecktech-operations\references\startup-prompt.md',
    'docs\governance\REMEDIATION_EXECUTION_PLAN.md',
    'ops\recovery\issues.json'
)) {
    $target = Join-Path $repoRoot $documentationPath
    if (Test-Path -LiteralPath $target -PathType Leaf) {
        $unsafeContent = Select-String -LiteralPath $target -Pattern '(?i)(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*[^\s\[\{<][^\r\n]{7,}' -AllMatches
        if ($unsafeContent) {
            $errors.Add("Candidate plaintext secret assignment found in governed documentation: $documentationPath")
        }
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Output "POLICY ERROR: $_" }
    exit 1
}

Write-Output 'Policy validation passed: 2026.08.18.1'
