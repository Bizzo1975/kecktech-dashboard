# Kecktech infrastructure remediation execution plan

Plan date: 2026-08-18  
Policy version: `2026.08.18.1`  
State: active; production mutation remains approval-gated

## Objective

Bring every production-connected Kecktech repository and service under one evidence-based, reviewable, recoverable development and deployment system without replacing newer live implementations with older Git history. No phase is complete based on documentation alone; its exit evidence must exist and pass review.

## Knowledge-capture discipline

- Building the knowledge base is part of implementation, not deferred documentation work.
- Before work, fetch the latest Daily Handoff and relevant canonical Notion pages. During work, capture verified architecture, topology, ownership, dependency, configuration, deployment, recovery, security, and troubleshooting facts that future work depends on.
- Update the existing canonical Notion page for the fact; do not create duplicate sources or append an unstructured running log.
- Record only observed or operator-confirmed facts. Mark incomplete facts `[ NEEDS CAPTURE ]`, contradictions as unresolved, and hypotheses explicitly as hypotheses.
- Store executable contracts, schemas, tests, ADRs, inventories, and versioned runbooks in the appropriate repository. Notion remains the human operational source of truth and should link to the executable source rather than duplicate it wholesale.
- A work item is not complete when its relevant code changed but its service catalog, deployment record, recovery procedure, ownership, or canonical Notion documentation is stale.
- Fetch the target Notion page immediately before each write and read it back afterward. Daily Handoff updates still require presenting the complete draft for operator approval first.

## Current truth

- Live production remains authoritative until each deployment is captured and reconciled with local and remote Git history.
- The local dashboard repository contains substantial uncommitted remediation. It has not been published or deployed.
- Governance policy `2026.08.18.1` and repository scaffolding exist locally across 14 identified repositories, but organization-wide enforcement is not active.
- The dashboard health contract, immutable-release evidence contract, container hardening, public-demo credential removal, and framework security upgrades are locally implemented. Final combined verification after the dependency upgrades was interrupted and must be rerun only after the DNS incident is stable.
- GitHub private-repository branch protection is unavailable on the current plan. Forgejo remains the selected canonical writable Git service with GitHub as a one-way private mirror, but Forgejo and isolated production runners are not deployed.
- PBS is intentionally suspended because storage is constrained. It must not be started or treated as failed. Recovery coverage remains incomplete.
- `KT-DNS-001` is the active P0 incident. Five DNS/internet drops were reported on 2026-08-18; the fifth recovered after rebooting `PVE-PROD-01`. Raw IP reachability remained available during one captured failure while DNS to both configured resolvers timed out. Root cause is unknown.

## Execution order

### Phase 0 — Stabilize and instrument DNS/networking

Entry condition: active now.

Actions:

1. Maintain the DNS/network change freeze.
2. Create a read-only incident capture procedure for Office-PC, NS-01, PVE-PROD-01, and the GS308EP path.
3. During the next failure, capture evidence before reboot when safely possible: gateway and public-IP reachability, DNS over UDP/TCP, ARP/neighbor state, relevant bridge/VLAN/interface counters, resolver listener/process state, AdGuard logs, OPNsense firewall decisions, Proxmox host resource state, and guest/network state.
4. Correlate exact outage, detection, reboot, and recovery timestamps. Do not infer cause from the component rebooted.
5. Identify the failed layer and design the least-disruptive recovery procedure.
6. Propose monitoring and resolver redundancy appropriate to this small self-hosted environment. Do not deploy it until reviewed and approved.

Implementation state (local only): the read-only runbook and Office-PC capture
script exist under `ops/network/`; their no-mutation validation passes. No capture
was run against NS-01, PVE-PROD-01, GS308EP, or the Netgear gateway, and no live
state was changed. Root-cause capture during a failure remains open.

Exit evidence:

- A captured failure identifies the failed layer with timestamped evidence.
- A non-destructive recovery method is documented and approved for validation.
- Gateway, raw WAN, local resolver, external resolver, and application-resolution monitoring designs are reviewed.
- No undocumented DNS, VLAN, firewall, switch, router, or Proxmox-network change occurred.

### Phase 1 — Preserve and reconcile live production

Dependency: Phase 0 stable enough that evidence collection and Git work cannot repeatedly disrupt operations.

Actions:

1. Inventory every production deployment: host/guest, service, runtime, running image or artifact identity, source location, configuration references, mounts, data ownership, deployment mechanism, and rollback material.
2. Capture source and configuration read-only, excluding secrets, databases, customer/family data, biometric assets, models, generated media, and runtime state.
3. Hash captures and record exclusions.
4. Compare live capture, local worktree, and remote history without pulling, resetting, checking out over, or deploying anything.
5. Classify every difference: authoritative live implementation, local development, governance, generated output, runtime state, private/secret data, obsolete material, or unresolved.
6. Construct a canonical reviewed branch only after the classification is accepted.

Exit evidence:

- Every production service has a timestamped deployment record and source/configuration provenance.
- Every dirty/diverged repository has an accepted reconciliation disposition.
- No newer live implementation can be overwritten by an older commit.

### Phase 2 — Complete and verify the dashboard remediation

Dependencies: Phase 1 reconciliation for VM230; DNS stability sufficient for repeatable tests.

Actions:

1. Review every dashboard diff against the captured VM230 implementation.
2. Rerun the clean locked verification under the supported Node runtime.
3. Confirm both npm dependency audits remain at zero known vulnerabilities.
4. Test the real CMS integration in an isolated compatible environment; the prior unavailable-CMS build proves only the unavailable state.
5. Validate the internal CA chain and hostname behavior without disabling TLS verification.
6. Verify Health API v2 consumers, mandatory dependency semantics, browser flows, accessibility, public-content scanning, and rollback.
7. Rotate/revoke the exposed demo credential only under separate credential-specific approval; verify it is absent from public source, bundles, artifacts, logs, and documentation.

Exit evidence:

- Clean verification, audit, integration, browser, accessibility, TLS, and rollback evidence is recorded.
- VM230 and the reviewed branch are reconciled.
- No reusable public credential or simulated health state remains.

### Phase 3 — Canonical Git and enforced governance

Dependencies: Phase 1 repository reconciliation.

Actions:

1. Deploy and harden Forgejo as the canonical writable Git service under a separately approved infrastructure change.
2. Configure protected branches, required reviews, required checks, signed/traceable releases, least-privilege identities, backups, and a one-way private GitHub mirror.
3. Move the prepared governance changes into small reviewed branches per repository.
4. Reconcile contradictory legacy instructions and verify policy version/checksum reporting.
5. Prove intentional policy, lint, type, test, secret, dependency, accessibility, image, provenance, and deployment-readiness failures block promotion.

Implementation state (local only): all 14 registered repositories now contain the
same versioned Kecktech operations skill, portable startup prompt, and bounded
AGENTS workflow block. The cross-repository validator passes. These uncommitted
files are durable local guidance, not proof of CI, branch protection, publication,
or deployment enforcement.

Exit evidence:

- All production-connected repositories report the effective policy version.
- Required checks and review controls are technically enforced, not merely documented.
- Expired exceptions block release.

### Phase 4 — Immutable CI/CD and development-to-production promotion

Dependencies: Phases 1–3.

Actions:

1. Remove runner-local deployment logic and keep deployment behavior in reviewed versioned repositories.
2. Provision isolated least-privilege runners before trusting their provenance.
3. Build once from locked dependencies; generate SBOM, vulnerability results, and signed provenance.
4. Deploy the immutable artifact to development and run the complete acceptance suite.
5. Promote the exact same digest to production only after authorized approval and recovery evidence.
6. Run post-deployment readiness, dependency, logs, metrics, and public-flow checks; stop or roll back on failure.

Exit evidence:

- Mutable branches and tags cannot deploy directly.
- Development and production identify the same verified artifact digest.
- Rollback to the recorded prior immutable artifact is demonstrated.

### Phase 5 — Remaining application and infrastructure remediation

Dependencies: the applicable repository must pass Phase 1 before implementation or deployment.

Priority workstreams:

1. Voice Clone: remove placeholder production behavior; reconcile the live Linux deployment; require privacy-controlled real-engine acceptance.
2. Sovereign: reconcile non-Git live source and diagnose failed evaluation services without weakening evidence locks.
3. Cleaner: prove repository mounts and credentials are least-privilege and source writes fail.
4. Access gaps: resolve VM400 through console evidence and establish supported access for LXC501/LXC502.
5. Dashboard integrations: verify ERPNext, TRMM, Zammad, Notion, and other shared contracts from both provider and consumer sides.
6. Fleet inventory: implement complete discovery of VMs, LXCs, containers, applications, ownership, and monitoring coverage.
7. Public sites and demos: verify all four domains, public websites, and every live demo through real critical-user journeys.

Exit evidence:

- Each issue in `ops/recovery/issues.json` reaches a verified terminal state with current evidence.
- No known production placeholder, fake status, unresolved critical acceptance item, or undocumented deployment remains.

### Phase 6 — Recovery under current storage constraints

PBS remains off unless separately approved.

Actions:

1. Inventory existing exports, snapshots, and backups without starting PBS.
2. Record protection, age, retention, storage location, and failure-domain separation for every critical dataset and configuration.
3. Prioritize identity, Git, edge/DNS configuration, databases, CMS/business content, and unique assets.
4. Test representative restores inside available non-production capacity.
5. Present the capacity gap and options for a second encrypted recovery location; procurement remains an operator decision.

Exit evidence:

- Every critical service states what is protected, where, when, and how restoration was tested.
- Snapshots are not represented as independent backups.
- Unprotected data and storage constraints are explicit.

## Immediate next action

The next action is Phase 0 read-only incident instrumentation—not another application change and not a DNS configuration change. Prepare and validate a capture bundle that gathers evidence from Office-PC and, after confirming the approved access path, read-only state from PVE-PROD-01 and NS-01. It must not restart, reload, flush, reconfigure, install, delete, or write to any live component.

After DNS is stable enough for repeatable work, resume Phase 1 with VM230 first because the dashboard, public site, CMS, credential exposure, and deployment pipeline all depend on its reconciliation.

## Approval boundaries

- Allowed now: local repository documentation/tests and explicitly read-only observation that does not alter live state.
- Separate exact approval required: production deployment, restart, service reload, DNS/firewall/VLAN/route change, Proxmox networking change, VM/LXC mutation, credential rotation, database write, destructive action, runner/Forgejo deployment, or PBS operation.
- Daily Handoff requires presenting the complete draft to the operator before writing it to Notion.
