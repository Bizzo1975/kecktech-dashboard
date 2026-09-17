[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('development', 'production')]
    [string]$Environment
)

$ErrorActionPreference = 'Stop'

Write-Error @"
Deployment to $Environment is intentionally blocked.

The retired workflow called C:\actions-runner\deploy.ps1 from a broad self-hosted
runner and deployed a mutable branch directly. It did not identify an immutable
artifact, prove live-source reconciliation, preserve rollback evidence, or run
post-deployment acceptance checks.

Do not bypass this gate. Replace it only with a reviewed in-repository deployment
implementation that builds once, verifies and signs the immutable artifact,
promotes the same artifact through development and production, records rollback
evidence, and stops or rolls back on failed acceptance criteria.
"@
