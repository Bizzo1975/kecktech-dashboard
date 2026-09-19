# Unified Assistant live reconciliation — 2026-09-15

Evidence captured: **2026-09-15T06:48:57Z–2026-09-15T06:58:20Z**  
Authority: operator recovery confirmation plus read-only captures from PVE-PROD-01 and VM122  
Change boundary: no application deployment, service restart, network change, model download, or source overwrite was performed.

## Current classification

- PVE-PROD-01: **VERIFIED LIVE** — reachable at the approved SSH alias; production VM inventory was returned.
- VM115 / prod-ollama-01: **CONTRADICTED** — Proxmox reports the VM running, but both the approved Tailscale SSH endpoint and the documented LAN SSH endpoint were unreachable. No QEMU guest agent is configured.
- VM122 / prod-sovereign-01: **VERIFIED LIVE** at the process/container layer — LAN SSH is reachable, `sovereign-api.service` is active, and Postgres, Neo4j, MinIO, and Redis containers report healthy. Application correctness is not inferred.
- Unified Assistant: **LOCALLY VERIFIED — NOT DEPLOYED** — the new Sovereign assistant files are absent from `/opt/sovereign`; VM115 cannot yet be captured; Nexus has no accepted live deployment record.
- KT-DNS-001: **DOCUMENTED — NEEDS REVERIFY** — this capture made no DNS, resolver, router, firewall, VLAN, switch, or Proxmox-network change.

## Repository identities after remote refresh

Remote references were fetched without merge, checkout, commit, push, reset, or working-tree modification.

| Repository | Branch / HEAD | Remote divergence | Preserved working state |
| --- | --- | --- | --- |
| Nexus | `main` / `64453eeff81e` | 0 behind / 0 ahead | 21 tracked changes; 20 untracked entries |
| GPU Broker | `main` / `c286920029b5` | 0 behind / 0 ahead | 6 tracked changes; 25 untracked entries |
| Huxley | `master` / `05c96264cefa` | 0 behind / 0 ahead | 32 tracked changes; 21 untracked entries |
| Sovereign | `master` / `bb38683fd216` | 0 behind / 0 ahead | 582 tracked changes; 461 untracked entries |
| Kecktech Dashboard | `dev` / `7d623c53619e` | 7 behind / 3 ahead | 23 tracked changes; 27 untracked entries |
| Kecktech Infrastructure | `main` / `e933a15d2674` | 0 behind / 0 ahead | 4 tracked changes; 7 untracked entries |

Counts are repository-entry counts from `git status --porcelain`; an untracked directory can contain multiple files. They are evidence of a dirty tree, not a disposition decision.

## Sovereign live-to-local comparison

Live `/opt/sovereign` is not a Git checkout.

| File | Live result | Local result | Disposition |
| --- | --- | --- | --- |
| `app/assistant_evidence_support.py` | missing | SHA-256 `5270f4642474f4421cc3d32cf2bf53962e16b967db5bad5b26d59eb1067bba93` | accepted-local candidate; not deployed |
| `app/routers/assistant.py` | missing | SHA-256 `2d08f292ff53b22089077858f0f5ed170934077bd9995d974c6506ad557a30b0` | accepted-local candidate; not deployed |
| `app/register_routers.py` | SHA-256 `d317bc27ade807cca01f97346f6a0fcb3c932bda1cdcbd7964fe5803faf02e15` | SHA-256 `5d47273809ee67391c1383f172828a9cb986c1710a9113605a1c178b69c42dc2` | merge-required |
| `docker-compose.yml` | SHA-256 `3b61f801d0f46eaaf9f54b2595a0a42d6b9502a4eaea0dfea8fbdb4d0a1d4e82` | SHA-256 `5ed280ba93c05fbf63fc5b8d1727855c681b8a8c22129a37954abc4c45639631` | merge-required |

No environment, credential, database, object data, model, log, manuscript, or generated-media content was captured.

## Storage intervention authorized during reconciliation

- Both PVE backup schedules were already disabled (`enabled: 0`); no schedule mutation was required.
- Eleven explicitly approved noncritical snapshots were permanently removed from `pbs-kecktech` for VMs 100, 104, 111, 112, 113, 115, 220, 232, 302, 400, and 401.
- PBS garbage collection completed successfully and reclaimed **118.221 GiB**.
- PBS datastore usage fell from **83.41%** to **15.14%**.
- Retained snapshots: VM103 (Vaultwarden), VM116 (KB), VM200 (ERPNext), and VM210 (Zammad). VM110 (Mailcow) had no snapshot to retain.
- PVE `local-zfs` remains **89.67%** used. VM120's virtual disk reports 171 GiB referenced on the host after guest garbage collection; reclaiming guest-free blocks requires a separately reviewed discard/TRIM step.

Deleted backups are not recoverable from PBS unless another independent copy exists.

## Deployment blockers and required order

1. Restore read-only access to VM115 and capture GPU Broker, LiT, GPU, disk, service, and source identities. Do not infer health from Proxmox power state.
2. Preserve each dirty local tree as reviewable commits/branches before integrating remote changes. Sovereign must be separated into coherent workstreams; its current tree is not deployable as a unit.
3. Reconcile Dashboard's 7-behind/3-ahead history and working tree without discarding either side.
4. Capture the complete live Sovereign source/configuration allowlist and classify each difference as accepted-live, accepted-local, merge-required, runtime-only, or unresolved.
5. Build immutable deployment artifacts from accepted clean revisions; record rollback identities and configuration ownership without secrets.
6. Deploy read-only Sovereign and LiT contracts first, then GPU Broker policy, then Nexus API with execution disabled, then Nexus UI.
7. Run the fixed offline and live acceptance suites. Enable each mutation path only after separate approval and domain-specific rollback verification.

No deployment is authorized by this record.
