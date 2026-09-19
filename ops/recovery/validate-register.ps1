[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSCommandPath

$issuePath = Join-Path $root 'issues.json'
$issueSchemaPath = Join-Path $root 'issues.schema.json'
$servicePath = Join-Path $root 'services.json'
$serviceSchemaPath = Join-Path $root 'services.schema.json'
$repositoryPath = Join-Path $root 'repositories.json'
$repositorySchemaPath = Join-Path $root 'repositories.schema.json'
$deploymentPath = Join-Path $root 'deployments.json'
$deploymentSchemaPath = Join-Path $root 'deployments.schema.json'

foreach ($path in @($issuePath, $issueSchemaPath, $servicePath, $serviceSchemaPath, $repositoryPath, $repositorySchemaPath, $deploymentPath, $deploymentSchemaPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required register file is missing: $path"
    }
}

$issues = Get-Content -Raw -LiteralPath $issuePath | ConvertFrom-Json
$issueSchema = Get-Content -Raw -LiteralPath $issueSchemaPath
$services = Get-Content -Raw -LiteralPath $servicePath | ConvertFrom-Json
$serviceSchema = Get-Content -Raw -LiteralPath $serviceSchemaPath
$repositories = Get-Content -Raw -LiteralPath $repositoryPath | ConvertFrom-Json
$repositorySchema = Get-Content -Raw -LiteralPath $repositorySchemaPath
$deployments = Get-Content -Raw -LiteralPath $deploymentPath | ConvertFrom-Json
$deploymentSchema = Get-Content -Raw -LiteralPath $deploymentSchemaPath

$issueJson = $issues | ConvertTo-Json -Depth 20
$serviceJson = $services | ConvertTo-Json -Depth 20
$repositoryJson = $repositories | ConvertTo-Json -Depth 20
$deploymentJson = $deployments | ConvertTo-Json -Depth 20

if (-not ($issueJson | Test-Json -Schema $issueSchema)) {
    throw 'issues.json does not satisfy issues.schema.json'
}

if (-not ($serviceJson | Test-Json -Schema $serviceSchema)) {
    throw 'services.json does not satisfy services.schema.json'
}

if (-not ($repositoryJson | Test-Json -Schema $repositorySchema)) {
    throw 'repositories.json does not satisfy repositories.schema.json'
}

if (-not ($deploymentJson | Test-Json -Schema $deploymentSchema)) {
    throw 'deployments.json does not satisfy deployments.schema.json'
}

$duplicateIssueIds = $issues.items | Group-Object id | Where-Object Count -gt 1
if ($duplicateIssueIds) {
    throw "Duplicate issue IDs: $($duplicateIssueIds.Name -join ', ')"
}

$duplicateServiceIds = $services.services | Group-Object id | Where-Object Count -gt 1
if ($duplicateServiceIds) {
    throw "Duplicate service IDs: $($duplicateServiceIds.Name -join ', ')"
}

$duplicateRepositoryIds = $repositories.repositories | Group-Object id | Where-Object Count -gt 1
if ($duplicateRepositoryIds) {
    throw "Duplicate repository IDs: $($duplicateRepositoryIds.Name -join ', ')"
}

$duplicateDeploymentIds = $deployments.deployments | Group-Object id | Where-Object Count -gt 1
if ($duplicateDeploymentIds) {
    throw "Duplicate deployment IDs: $($duplicateDeploymentIds.Name -join ', ')"
}

$knownRepositoryIds = @($repositories.repositories.id)
foreach ($deployment in $deployments.deployments) {
    if ($deployment.repositoryId -notin $knownRepositoryIds) {
        throw "Deployment $($deployment.id) references unknown repository $($deployment.repositoryId)"
    }
}

$knownIssueIds = @($issues.items.id)
foreach ($issue in $issues.items) {
    foreach ($dependency in @($issue.dependencies)) {
        if ($dependency -notin $knownIssueIds) {
            throw "Issue $($issue.id) references unknown dependency $dependency"
        }
    }
}

Write-Output "Recovery register valid: $($issues.items.Count) issues, $($services.services.Count) services, $($repositories.repositories.Count) repositories, $($deployments.deployments.Count) deployments."
