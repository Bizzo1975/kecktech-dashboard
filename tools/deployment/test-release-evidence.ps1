$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$validator = Join-Path $PSScriptRoot 'assert-release-evidence.ps1'
$digestA = 'a' * 64
$digestB = 'b' * 64
$image = "registry.example.test/kecktech/dashboard:release@sha256:$digestA"
$previous = "registry.example.test/kecktech/dashboard:previous@sha256:$digestB"
$tempFile = New-TemporaryFile

function Write-TestManifest([object]$Manifest) {
    $Manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tempFile.FullName -Encoding utf8
}

function Expect-Blocked([scriptblock]$Mutation, [string]$Name) {
    $manifest = $valid | ConvertTo-Json -Depth 20 | ConvertFrom-Json -Depth 20
    & $Mutation $manifest
    Write-TestManifest $manifest
    try {
        & $validator -Manifest $tempFile.FullName -Stage production *> $null
        throw "Regression: $Name was accepted."
    } catch {
        if ($_.Exception.Message -eq "Regression: $Name was accepted.") { throw }
    }
}

try {
    $valid = [ordered]@{
        schemaVersion = '1.0.0'
        releaseId = 'test-release'
        source = [ordered]@{ repository = 'example/repo'; commitSha = 'c' * 40; liveReconciled = $true; reconciliationEvidence = 'evidence://reconciliation' }
        artifacts = @([ordered]@{ role = 'dashboard'; image = $image; sbom = 'evidence://sbom'; provenance = 'evidence://provenance'; signatureVerified = $true })
        promotion = [ordered]@{
            development = [ordered]@{ images = @($image); acceptancePassed = $true; evidence = 'evidence://development' }
            production = [ordered]@{ images = @($image); acceptancePassed = $true; evidence = 'evidence://production'; authorizedApproval = 'approval://authorized'; recoveryEvidence = 'evidence://recovery'; previousImages = @($previous); rollbackReady = $true }
        }
    }

    Write-TestManifest $valid
    & $validator -Manifest $tempFile.FullName -Stage candidate | Out-Null
    & $validator -Manifest $tempFile.FullName -Stage development | Out-Null
    & $validator -Manifest $tempFile.FullName -Stage production | Out-Null

    Expect-Blocked { param($m) $m.source.liveReconciled = $false } 'unreconciled source'
    Expect-Blocked { param($m) $m.artifacts[0].image = 'registry.example.test/kecktech/dashboard:latest' } 'mutable artifact'
    Expect-Blocked { param($m) $m.promotion.production.images = @($previous) } 'different production artifact'
    Expect-Blocked { param($m) $m.promotion.production.authorizedApproval = '' } 'missing approval'
    Expect-Blocked { param($m) $m.promotion.production.rollbackReady = $false } 'missing rollback readiness'
    Write-Output 'Release evidence regression tests passed.'
} finally {
    Remove-Item -LiteralPath $tempFile.FullName -Force
}
