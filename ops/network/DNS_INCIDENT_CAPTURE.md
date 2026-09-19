# KT-DNS-001 read-only incident capture

Status: active P0; mutation freeze in force  
Evidence baseline: 2026-08-18  
Policy version: `2026.08.18.1`

This procedure collects evidence only. It does not authorize a restart, reload,
flush, failover, configuration edit, packet injection, or credential change.
Recovery after reboot is correlation, not proof of root cause.

## Safety boundary

Do not change AdGuard, OPNsense, Unbound, DHCP, firewall rules, VLANs, routes,
GS308EP settings, Proxmox networking, VM/LXC state, client resolvers, or service
state without separate approval naming the exact action and target.

Do not use `StrictHostKeyChecking=no`, accept a changed SSH host key, display
environment variables, copy configuration containing secrets, or capture packet
payloads. If approved read-only access is unavailable, record `[ NEEDS CAPTURE ]`.

## At the first sign of failure

1. Record local time, UTC time, affected clients, and the exact user-visible symptom.
2. From Office-PC, run `Capture-DnsIncident.ps1` before any reboot or restart when safe.
3. Preserve each device's clock and evidence independently; do not merge logs by
   assumed timing.
4. From an already trusted administrative session, collect only the read-only
   observations below. If a command is unavailable, record that fact.

## Office-PC (`10.10.0.100`, MGMT)

The script records adapter and resolver configuration, routing, ARP/neighbor state,
ICMP reachability to `10.10.0.1`, `192.168.1.1`, and `1.1.1.1`, DNS UDP behavior,
and DNS TCP/53 reachability. Its output belongs under `.recovery-private/` and must
not be committed.

```powershell
pwsh -NoProfile -File ops/network/Capture-DnsIncident.ps1
```

## NS-01 (`10.10.0.1`)

Observe without changing state:

- OPNsense interface, gateway, route, firewall-decision, and resource state.
- UDP/TCP port 53 listeners and owning process.
- AdGuard Home service/process state and logs around the incident timestamp.
- AdGuard upstream query failures, latency, and resource pressure without exposing
  client query content or credentials.
- Unbound state only to distinguish it from the separate AdGuard service.
- WAN reachability to the Netgear gateway and a public IP.

Use the OPNsense UI or a previously trusted console/session. Export only sanitized,
timestamped evidence. Do not restart or reload either DNS service.

## PVE-PROD-01 (`10.10.0.11`)

Observe without changing state:

- Host uptime, load, memory pressure, storage pressure, and kernel events.
- Physical link, bridge, VLAN-aware bridge, tap/veth, and interface counter state.
- Packet drops/errors and firewall log decisions around NS-01 and DNS traffic.
- NS-01 guest runtime/resource state and its interface attachment.

Do not reboot the host or guest, cycle a link, modify a bridge/VLAN/firewall, or
restart any service during capture.

## GS308EP and Netgear gateway

From their existing management interfaces, record read-only port link/speed,
error/drop counters, VLAN/PVID membership, uptime/event log, and the exact ports
used by the Netgear-to-NS-01 and NS-01-to-GS308EP paths. Do not save or apply.

## Evidence classification and exit

Classify each observation as VERIFIED LIVE, OPERATOR CONFIRMED, NEEDS REVERIFY,
CONTRADICTED, or `[ NEEDS CAPTURE ]`. The freeze remains until evidence identifies
the failed layer and a least-disruptive recovery has a rollback plan and exact
approval. A successful ping, open port, running process, or later reboot recovery
does not independently prove DNS health or causation.
