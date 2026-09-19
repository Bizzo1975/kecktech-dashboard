# Nexus VM125 — exact installation approval

Status: VERIFIED LIVE — approved read-only pilot installed and acceptance passed September 17 13:05:12 UTC. Service enabled/active; loopback listener 127.0.0.1:8787; NRestarts=0 at independent follow-up. Existing operator/read credentials reused without rotation; configuration root:root 0600, unit root:root 0644. Authenticated Sovereign evidence and LiT explicit-unknown queries through Nexus passed; unauthenticated requests rejected 401. Two labeled acceptance conversations survived exactly one approved service restart. State file 0600 and directory 0700 verified. Write keys and models remain disabled. Evidence: `nexus-installation-result-2026-09-17.json`. Notion synchronization is blocked by revoked OAuth authorization; no Daily Handoff was written. The plan below is retained as the approved execution record.

## Current evidence

- VM125 `10.20.0.125`: Ubuntu 24.04.5 x86_64, systemd 255, about 26 GiB free. No Node runtime, Nexus unit, existing target directories/configuration, or listener on 8787 found in targeted checks.
- Claude's current assistant source matches the reviewed manifest; unrelated work is preserved.
- Clean isolated dependency installation from exact versions and a new lockfile completed with lifecycle scripts disabled. Linux Node 24.19.0 compiled the assistant; all 26 regressions passed. Compiled runtime JavaScript exactly matches the packaged files.
- Actual local Linux HTTP process rejects unauthenticated requests, accepts its isolated operator token, and preserves all eight concurrent conversation records across process restart. This is process-restart evidence, not power-loss durability or multi-process writer support.
- Proposed systemd directives pass local Ubuntu `systemd-analyze verify` with the executable path mapped to the verified local Linux runtime. Local Windows-mounted file permissions caused warnings; install unit as root:root 0644 and reverify the exact installed unit before start.
- VM125 authenticated read calls succeed using verified LAN endpoints: Sovereign `http://10.20.0.122:8200` returns a citation; LiT `http://10.20.0.115:8202` returns explicit unknown for a deliberately nonexistent manuscript scope. Existing Tailscale endpoints returned connection errors from VM125; no network changes were made. Do not copy workstation service URLs blindly.
- Official Node Linux archive SHA-256 matches its HTTPS-published checksum. Release-signature/provenance attestation is not claimed.

## Exact artifacts

See `nexus-installation-manifest-2026-09-17.json` for full paths, hashes, source identity, document list and clean-build-lock digest. Recompute immediately before transfer and abort on mismatch.

- Application identity: `d137953f806a9afd4ed597bada03ea45abfe85214f7110f511e2e381fe0dc069`.
- Application archive SHA-256: `f5cfa70acec5669490a302403631d3c9548077eed763d1532a6ef3e0b06a71b6`.
- Node 24.19.0 Linux x64 archive SHA-256: `14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647`.
- Document snapshot identity: `5606a98c003cec122db2d088676b62098aa3cff0442285b7330cda9a18c6bdab`, six allowlisted Markdown files from Dashboard and infrastructure. These are bounded document snapshots, not complete repositories or deployed code. Snapshot contents stay read-only and retain source hashes.

## Requested authorized actions on VM125 only

1. Recheck target absence/current source and capacity. Abort for any unexpected existing Nexus installation; reconcile before touching it.
2. Transfer verified application, runtime and document archives over SSH to a protected staging directory. Verify hashes again. Inspect archive members against manifests; reject traversal/symlinks in application/doc archives and validate the vendor runtime layout. Preserve staging/evidence on failure.
3. Install root-owned runtime at `/opt/nexus/runtime` and immutable application at `/opt/nexus/assistant/releases/d137953f806a9afd4ed597bada03ea45abfe85214f7110f511e2e381fe0dc069`; atomically set `/opt/nexus/assistant/current`. No in-place application build on VM125.
4. Install only the six reviewed documents beneath `/srv/nexus/repos/kecktech-dashboard` and `/srv/nexus/repos/kecktech-infrastructure`, root-owned, directories 0755/files 0644. Configure exactly those two snapshot roots.
5. Create `/etc/nexus/assistant.env`, root:root 0600, reusing the existing local Nexus operator token and existing Sovereign/LiT READ keys via encrypted SSH input. Do not print values, include them in arguments/archives/evidence, generate new keys, rotate keys, or copy the workstation `.env` wholesale. Set the verified LAN URLs and explicit Linux repository roots. Domain write keys, GPU credentials and cloud execution remain absent/disabled.
6. Install only `/etc/systemd/system/nexus-assistant.service` as root:root 0644, run systemd configuration reload, enable and start only `nexus-assistant.service`. Its DynamicUser and StateDirectory create `/var/lib/nexus-assistant` with private permissions. Listener remains `127.0.0.1:8787`; no firewall, DNS or proxy changes.
7. Validate the exact installed unit, artifact hashes, service identity/state-directory permissions, listener binding, unauthenticated denial, authenticated capabilities and real read-only domain queries through Nexus. Create clearly labeled test conversation records (no customer/manuscript content), perform one Nexus-only restart, and verify records survive. Preserve test records as acceptance evidence. Do not invoke proposal execution, models, GPU jobs, messages or unrelated applications.
8. If acceptance fails, stop and disable only the new Nexus unit, retain private state/artifacts/evidence, and report the failed gate. Because this is first installation there is no prior application version to restore. Do not delete data or modify another service.

## Limits and subsequent work

No UI/public route is included; service access initially uses local authenticated API checks over SSH. A persistent operator tunnel or reverse-proxy route is a separate decision. Clean dependency build and checksum identity are verified; organization-wide signing, SBOM/CI promotion and enforcement remain separate governance gaps. This proposed pilot does not mark those complete. Domain write execution concurrency/idempotency and genuine model workflows require separate acceptance before enabling write/model keys.

Approval should name this VM125 installation/start/one-restart/rollback scope, reuse of the three existing credentials, and the bounded read-only pilot. No production action from this plan has been executed.
