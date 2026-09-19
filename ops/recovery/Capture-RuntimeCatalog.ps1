$ErrorActionPreference = 'Stop'
$sshBin = 'C:/Program Files/Git/usr/bin/ssh.exe'
$keyPath = 'C:/Users/jonkd/.ssh/id_ed25519'
$outPath = 'F:/Github/kecktech-infrastructure/inventory/runtime-capture-2026-09-15.json'
$common = @('-i',$keyPath,'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8')
$clusterRaw = & $sshBin @common root@100.111.219.30 'pvesh get /cluster/resources --type vm --output-format json'
if ($LASTEXITCODE -ne 0) { throw 'Cluster inventory failed' }
$guests = ($clusterRaw -join "`n") | ConvertFrom-Json
$baseline = Get-Content 'F:/Github/kecktech-dashboard/ops/recovery/FLEET_CATALOG_BASELINE_2026-09-15.json' -Raw | ConvertFrom-Json
$results = [Collections.Generic.List[object]]::new()
$remote = 'printf "TIME\n"; date -u +%FT%TZ; printf "HOST\n"; hostname; printf "DOCKER\n"; if command -v docker >/dev/null; then docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"; else echo docker-not-installed; fi; printf "SERVICES\n"; systemctl list-units --type=service --state=running,failed --no-pager --no-legend; printf "TIMERS\n"; systemctl list-timers --all --no-pager --no-legend; printf "LISTENERS\n"; ss -lntu; printf "DISK\n"; df -Pk /'
foreach ($guest in $guests) {
 $record = [ordered]@{vmid=$guest.vmid; name=$guest.name; node=$guest.node; type=$guest.type; powerState=$guest.status; template=[bool]$guest.template; cpuAllocated=$guest.maxcpu; ramAllocatedBytes=$guest.maxmem; diskAllocatedBytes=$guest.maxdisk; capturedAt=[DateTime]::UtcNow.ToString('o'); evidenceClass='VERIFIED LIVE'; runtimeStatus='not_inspected'; output=$null}
 if ($guest.template -or $guest.status -ne 'running') { $record.runtimeStatus='not_inspected_stopped_or_template' }
 elseif ($guest.type -eq 'lxc') {
  $nodeIP = if ($guest.node -eq 'pve-prod-01') {'100.111.219.30'} else {'100.102.95.14'}
  $remoteLxc = 'pct exec ' + $guest.vmid + ' -- sh -c ' + "'" + $remote + "'"
  $capture = & $sshBin @common "root@$nodeIP" $remoteLxc 2>&1
  $record.runtimeStatus = if ($LASTEXITCODE -eq 0) {'captured'} else {'capture_failed'}
  $record.output = ($capture | Out-String)
 } else {
  $match = $baseline.hosts | Where-Object id -eq ([string]$guest.vmid) | Select-Object -First 1
  if ($match) {
   $ip = if ($match.tailscale -match '^100\.[0-9.]+$') {$match.tailscale} else {$match.lan}
   $capture = & $sshBin @common "kecktech@$ip" $remote 2>&1
   $code = $LASTEXITCODE
   if ($code -ne 0 -and $ip -ne $match.lan) {
    $capture = & $sshBin @common "kecktech@$($match.lan)" $remote 2>&1
    $code = $LASTEXITCODE
   }
   $record.runtimeStatus = if ($code -eq 0) {'captured'} else {'capture_failed'}
   $record.output = ($capture | Out-String)
  }
 }
 $results.Add([pscustomobject]$record)
 Write-Output "$($guest.vmid) $($record.runtimeStatus)"
 [ordered]@{capturedAt=[DateTime]::UtcNow.ToString('o'); scope='Current cluster membership plus missing/contradictory runtime catalog coverage. Metadata only; no secrets, environment or data contents.'; guests=$results.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outPath -Encoding utf8
}

