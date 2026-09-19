[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$Manifest,

    [Parameter(Mandatory)]
    [ValidateSet('candidate', 'development', 'production')]
    [string]$Stage
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Require-Text([object]$Value, [string]$Field) {
    if ($Value -isnot [string] -or [string]::IsNullOrWhiteSpace($Value)) { throw "Missing release evidence: $Field" }
}

function Require-ImmutableImages([object[]]$Images, [string]$Field) {
    if ($null -eq $Images -or $Images.Count -eq 0) { throw "Missing release evidence: $Field" }
    & (Join-Path $PSScriptRoot 'assert-immutable-image-references.ps1') -ImageReference $Images | Out-Null
}

$evidence = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json -Depth 20
if ($evidence.schemaVersion -ne '1.0.0') { throw 'Unsupported release evidence schemaVersion.' }
Require-Text $evidence.releaseId 'releaseId'
Require-Text $evidence.source.repository 'source.repository'
if ($evidence.source.commitSha -notmatch '^[a-f0-9]{40}$') { throw 'source.commitSha must be a full lowercase 40-character Git SHA.' }
if ($evidence.source.liveReconciled -ne $true) { throw 'Live-to-Git reconciliation evidence is required.' }
Require-Text $evidence.source.reconciliationEvidence 'source.reconciliationEvidence'

if ($null -eq $evidence.artifacts -or $evidence.artifacts.Count -eq 0) { throw 'At least one artifact is required.' }
$artifactImages = @($evidence.artifacts | ForEach-Object {
    Require-Text $_.role 'artifacts[].role'
    Require-Text $_.sbom 'artifacts[].sbom'
    Require-Text $_.provenance 'artifacts[].provenance'
    if ($_.signatureVerified -ne $true) { throw "Artifact signature is not verified: $($_.role)" }
    $_.image
})
Require-ImmutableImages $artifactImages 'artifacts[].image'
$uniqueArtifactImages = @($artifactImages | Sort-Object -Unique)
if ($uniqueArtifactImages.Count -ne $artifactImages.Count) { throw 'Artifact image references must be unique.' }

if ($Stage -in @('development', 'production')) {
    $developmentImages = @($evidence.promotion.development.images)
    Require-ImmutableImages $developmentImages 'promotion.development.images'
    if ($evidence.promotion.development.acceptancePassed -ne $true) { throw 'Development acceptance has not passed.' }
    Require-Text $evidence.promotion.development.evidence 'promotion.development.evidence'
    if ((Compare-Object ($artifactImages | Sort-Object) ($developmentImages | Sort-Object))) { throw 'Development did not receive the exact candidate artifact set.' }
}

if ($Stage -eq 'production') {
    $production = $evidence.promotion.production
    $productionImages = @($production.images)
    Require-ImmutableImages $productionImages 'promotion.production.images'
    if ((Compare-Object ($artifactImages | Sort-Object) ($productionImages | Sort-Object))) { throw 'Production did not receive the exact development-tested artifact set.' }
    if ($production.acceptancePassed -ne $true) { throw 'Production post-deployment acceptance has not passed.' }
    Require-Text $production.evidence 'promotion.production.evidence'
    Require-Text $production.authorizedApproval 'promotion.production.authorizedApproval'
    Require-Text $production.recoveryEvidence 'promotion.production.recoveryEvidence'
    Require-ImmutableImages @($production.previousImages) 'promotion.production.previousImages'
    if ($production.rollbackReady -ne $true) { throw 'Production rollback readiness is not proven.' }
}

Write-Output "Release evidence validation passed for stage: $Stage"
Write-Output 'This structural validation does not replace cryptographic signature, SBOM, provenance, or live acceptance verification.'
