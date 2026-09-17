$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$validator = Join-Path $PSScriptRoot 'assert-immutable-image-references.ps1'
$digest = 'a' * 64

$null = & $validator -ImageReference @(
    "registry.example.test/kecktech/dashboard:2026.08.18@sha256:$digest",
    "docker.io/library/nginx:alpine@sha256:$digest"
)

$blocked = $false
try {
    $null = & $validator -ImageReference 'registry.example.test/kecktech/dashboard:latest' 2>$null
} catch {
    $blocked = $true
}

if (-not $blocked) {
    throw 'Mutable image regression: latest was accepted.'
}

Write-Output 'Mutable image regression test passed.'
