$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))

function Assert-SafeBlockedWorkflow {
    param(
        [Parameter(Mandatory)] [string] $RelativePath,
        [Parameter(Mandatory)] [ValidateSet('development', 'production')] [string] $Environment
    )

    $path = Join-Path $repositoryRoot $RelativePath
    $workflow = Get-Content -Raw -LiteralPath $path

    if ($workflow -notmatch '(?m)^\s*workflow_dispatch:\s*$') {
        throw "$RelativePath must be manual-only."
    }
    if ($workflow -match '(?m)^\s*push:\s*$') {
        throw "$RelativePath must not deploy from a push event."
    }
    if ($workflow -match '(?i)self-hosted|deploy\.ps1|\b(?:10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.(?:\d{1,3}\.){2}\d{1,3}\b') {
        throw "$RelativePath contains a retired runner, deploy script, or direct infrastructure target."
    }
    if ($workflow -notmatch "assert-deployment-authorized\.ps1\s+-Environment\s+$Environment") {
        throw "$RelativePath must fail closed through the $Environment authorization gate."
    }
}

Assert-SafeBlockedWorkflow -RelativePath '.github\workflows\deploy-dev.yml' -Environment development
Assert-SafeBlockedWorkflow -RelativePath '.github\workflows\deploy-prod.yml' -Environment production

Write-Output 'Deployment workflow safety regression tests passed.'
