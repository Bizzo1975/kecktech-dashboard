$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("kecktech-guidance-test-" + [guid]::NewGuid().ToString('N'))

function Copy-RelativeFile {
    param([Parameter(Mandatory)] [string] $RelativePath)
    $source = Join-Path $repositoryRoot $RelativePath
    $destination = Join-Path $testRoot $RelativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

function Invoke-FixtureValidation {
    $validator = Join-Path $testRoot 'tools\policy\validate-repository-guidance.ps1'
    $output = & (Get-Process -Id $PID).Path -NoProfile -File $validator 2>&1
    return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = ($output -join "`n") }
}

try {
    $manifest = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot '.policy\guidance-manifest.json') | ConvertFrom-Json
    foreach ($relativePath in @(
        '.policy\guidance-manifest.json',
        'tools\policy\validate-repository-guidance.ps1',
        'AGENTS.md',
        'CONTRIBUTING.md',
        'SECURITY.md',
        '.github\CODEOWNERS',
        '.github\pull_request_template.md'
    ) + @($manifest.files.psobject.Properties.Name)) {
        Copy-RelativeFile -RelativePath $relativePath
    }

    $baseline = Invoke-FixtureValidation
    if ($baseline.ExitCode -ne 0) { throw "Baseline fixture failed:`n$($baseline.Output)" }

    Add-Content -LiteralPath (Join-Path $testRoot 'PROJECT_INSTRUCTIONS.md') -Value "`nunauthorized drift"
    $drift = Invoke-FixtureValidation
    if ($drift.ExitCode -eq 0 -or $drift.Output -notmatch 'Shared policy drift') {
        throw 'Shared-file drift was not rejected.'
    }
    Copy-RelativeFile -RelativePath 'PROJECT_INSTRUCTIONS.md'

    $agentsPath = Join-Path $testRoot 'AGENTS.md'
    $agents = Get-Content -Raw -LiteralPath $agentsPath
    $marker = '<!-- BEGIN KECKTECH OPERATIONS POLICY 2026.08.18.1 -->'
    $endMarker = '<!-- END KECKTECH OPERATIONS POLICY 2026.08.18.1 -->'
    $managedBlock = [regex]::Match($agents, "(?s)$([regex]::Escape($marker)).*?$([regex]::Escape($endMarker))").Value
    if ([string]::IsNullOrWhiteSpace($managedBlock)) { throw 'Fixture AGENTS managed block is missing.' }
    Set-Content -LiteralPath $agentsPath -Value ($agents + "`n" + $managedBlock) -Encoding utf8NoBOM
    $duplicate = Invoke-FixtureValidation
    if ($duplicate.ExitCode -eq 0 -or $duplicate.Output -notmatch 'Managed block must occur exactly once') {
        throw 'Duplicate managed block was not rejected.'
    }

    Write-Output 'Repository guidance negative tests passed.'
} finally {
    if (Test-Path -LiteralPath $testRoot -PathType Container) {
        $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $resolvedTest = [System.IO.Path]::GetFullPath($testRoot)
        if (-not $resolvedTest.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not (Split-Path -Leaf $resolvedTest).StartsWith('kecktech-guidance-test-', [System.StringComparison]::Ordinal)) {
            throw "Refusing unexpected test cleanup path: $resolvedTest"
        }
        Remove-Item -LiteralPath $resolvedTest -Recurse -Force
    }
}

# The negative fixtures intentionally launch validators that exit non-zero.
# PowerShell on Linux preserves that native exit code even after the assertions
# pass, so make the successful harness outcome explicit for CI.
exit 0
