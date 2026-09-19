[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\.recovery-private\dns-incidents'),
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$targets = @(
    @{ Name = 'NS-01'; Address = '10.10.0.1' },
    @{ Name = 'Netgear'; Address = '192.168.1.1' },
    @{ Name = 'Public-IP'; Address = '1.1.1.1' }
)
$resolvers = @('10.10.0.1', '1.1.1.1')

if ($ValidateOnly) {
    [pscustomobject]@{
        Mode = 'ValidateOnly'
        MutationsPerformed = $false
        Targets = @('10.10.0.1', '192.168.1.1', '1.1.1.1')
        Resolvers = @('10.10.0.1', '1.1.1.1')
    } | ConvertTo-Json -Depth 3
    exit 0
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$privateRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot '.recovery-private'))
$boundary = $privateRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not ($resolvedOutput + [System.IO.Path]::DirectorySeparatorChar).StartsWith($boundary, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputDirectory must be within $privateRoot"
}

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$outputPath = Join-Path $resolvedOutput "office-pc-$stamp.json"

function Invoke-ObservedCommand {
    param([scriptblock]$Command)
    try {
        (& $Command 2>&1 | Out-String).Trim()
    } catch {
        "UNAVAILABLE: $($_.Exception.Message)"
    }
}

$reachability = foreach ($target in $targets) {
    [pscustomobject]@{
        Name = $target.Name
        Address = $target.Address
        Icmp = Invoke-ObservedCommand { Test-Connection -TargetName $target.Address -Count 2 }
    }
}

$dns = foreach ($resolver in $resolvers) {
    [pscustomobject]@{
        Resolver = $resolver
        UdpQuery = Invoke-ObservedCommand { Resolve-DnsName -Name example.com -Server $resolver -DnsOnly -NoHostsFile -QuickTimeout }
        Tcp53 = Invoke-ObservedCommand { Test-NetConnection -ComputerName $resolver -Port 53 -InformationLevel Detailed }
    }
}

$evidence = [ordered]@{
    schemaVersion = '1.0.0'
    incident = 'KT-DNS-001'
    capturedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    host = $env:COMPUTERNAME
    mode = 'read-only-local-observation'
    mutationsPerformed = $false
    adapterConfiguration = Invoke-ObservedCommand { Get-NetIPConfiguration -Detailed }
    dnsClientConfiguration = Invoke-ObservedCommand { Get-DnsClientServerAddress }
    routeTable = Invoke-ObservedCommand { Get-NetRoute | Sort-Object InterfaceIndex, DestinationPrefix }
    neighborTable = Invoke-ObservedCommand { Get-NetNeighbor | Sort-Object InterfaceIndex, IPAddress }
    reachability = $reachability
    dns = $dns
    limitations = @(
        'This capture does not inspect NS-01, PVE-PROD-01, GS308EP, or Netgear internals.',
        'Success or failure is evidence of observed behavior, not a root-cause conclusion.',
        'No service, resolver cache, network interface, route, firewall, VM, or host state was changed.'
    )
}

$evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputPath -Encoding utf8NoBOM
Write-Output $outputPath
