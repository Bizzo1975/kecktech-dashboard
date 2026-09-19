$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptPath = Join-Path $PSScriptRoot 'Capture-DnsIncident.ps1'
$text = Get-Content -LiteralPath $scriptPath -Raw
$forbidden = @(
    'Restart-Service', 'Stop-Service', 'Start-Service', 'Restart-Computer',
    'Clear-DnsClientCache', 'Set-DnsClientServerAddress', 'New-NetRoute',
    'Remove-NetRoute', 'Set-NetIPInterface', 'Disable-NetAdapter',
    'Enable-NetAdapter', 'Invoke-Command', 'Enter-PSSession', 'ssh '
)
foreach ($term in $forbidden) {
    if ($text.IndexOf($term, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        throw "Forbidden mutation or remote-execution token found: $term"
    }
}

$result = & $scriptPath -ValidateOnly | ConvertFrom-Json
if ($result.Mode -ne 'ValidateOnly' -or $result.MutationsPerformed -ne $false) {
    throw 'ValidateOnly contract failed.'
}

Write-Output 'DNS incident capture safety validation passed.'
