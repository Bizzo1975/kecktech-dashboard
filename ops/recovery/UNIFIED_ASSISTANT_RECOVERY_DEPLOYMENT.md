# Unified Assistant recovery and deployment gate

Evidence status: **LOCALLY VERIFIED — NOT DEPLOYED**  
Prepared: 2026-09-01  
Authority: `PROJECT_INSTRUCTIONS.md`, repository-specific policies, and accepted live-to-Git reconciliation.

## Purpose

This record defines the recovery-time sequence for the Nexus Assistant integration with Sovereign, Lost in Thought (LiT), and GPU Broker. It authorizes no deployment, restart, network change, credential change, model download, or storage cleanup. Live state remains authoritative after the host is recovered.

## Ownership and trust boundaries

- Nexus owns the single-operator UI, conversations, orchestration metadata, proposal approvals, and audit trail.
- Sovereign owns homelab graph/KB evidence and operational mutation execution.
- LiT owns manuscript sources, sentence/fact evidence, occurrence records, canon mutations, and propagation.
- GPU Broker owns model scheduling through the maintained `POST /v1/jobs` contract. Direct Ollama calls from Nexus are forbidden.
- Open WebUI is optional and non-authoritative.
- Nexus must not write directly to Sovereign or LiT databases.

## Required local artifacts before recovery

- Nexus: isolated `assistant-api` and `assistant-ui`, typed response envelope, authentication, audit persistence, SSE, proposal review, domain isolation, broker client, and offline contract tests.
- Sovereign: authenticated read-only evidence query contract and separately authenticated proposal execution contract. Historical observations remain stale until a new capture proves otherwise.
- LiT: authenticated manuscript-scoped evidence query contract and proposal translation into the existing mutation lifecycle. A request without a manuscript ID must fail.
- GPU Broker: `nexus-assistant` consumer policy, RTX 3090-only production scheduling, bounded jobs, idempotency, cancellation, restart recovery, storage/model allowlist gates, and observable failure tests.
- Cross-repository: pinned request/response contract fixtures, deployment configuration examples without secrets, rollback steps, and a local acceptance report.

## Recovery-time reconciliation — mandatory before deployment

1. Capture immutable Git identities and dirty-state manifests for Nexus, GPU Broker, Huxley, and Sovereign.
2. Capture deployed source/configuration identities without copying secrets, models, manuscripts, databases, object data, logs, or generated media.
3. Compare live artifacts with local repositories. Record every difference as accepted-live, accepted-local, merge-required, secret/runtime-only, or unresolved.
4. Do not deploy a local tree over a live service until its disposition is accepted by the operator.
5. Reverify KT-DNS-001. No DNS, router, firewall, VLAN, switch, Proxmox networking, resolver, VM/LXC, restart, reload, or flush action is bundled into this deployment.
6. Fetch the latest Notion Daily Handoff, canonical Infrastructure Recovery & Development Governance Execution Plan, Known Issues, and relevant Environment Brain pages immediately before operational work.

## Development acceptance

- All repository-native builds, unit tests, contract tests, security tests, and policy validators pass from locked dependencies.
- Offline end-to-end tests prove homelab stale-state handling, LiT manuscript isolation, contradiction display, honest unknowns, single-use approvals, expired/tampered approval rejection, broker timeout/cancel/failure behavior, and zero direct Ollama/cloud bypass.
- No source file or fixture contains a credential, manuscript, model weight, database, generated media, or live private response.
- Deployment images/configuration have immutable identities, SBOM/provenance references, rollback identities, and reproducible build evidence.

## Proposed deployment order

This order is a plan, not authorization:

1. Deploy compatible read-only evidence endpoints to Sovereign and LiT after their individual reconciliations.
2. Deploy GPU Broker policy/consumer changes after VM115 and GPU-host reconciliation; submit no model download during deployment.
3. Deploy Nexus Assistant API with domain execution disabled and validate authentication, capability honesty, citations, timeouts, and audit persistence.
4. Deploy Nexus Assistant UI and validate keyboard navigation, responsive layout, evidence drawer, domain labels, and proposal review.
5. Enable proposal execution per domain only after read-only acceptance passes and the operator separately approves that domain's mutation path.

## Post-deployment acceptance

- Capability status distinguishes liveness from readiness and never labels old observations current.
- A fixed homelab question set returns citations or explicit unknowns; no unsupported current-health claim is permitted.
- A fixed LiT question set returns sentence/fact citations only from the selected manuscript.
- Contradictory evidence remains unresolved and visible until the owning domain resolves it.
- GPU requests appear as authenticated `nexus-assistant` `/v1/jobs` records with enforced budgets and terminal state.
- Cancel, timeout, broker outage, domain outage, malformed response, and exhausted budget are visible to the operator.
- An unapproved, expired, modified, or reused proposal cannot execute.
- Audit records identify actor, proposal digest, domain, target, expected revision, result revision, and timestamps without secret values.

## Rollback

1. Disable Nexus proposal execution while preserving read-only access and audit data.
2. Roll back Nexus UI/API to the previous immutable artifacts.
3. Roll back domain endpoints independently; do not roll back domain data stores.
4. Remove only the `nexus-assistant` GPU consumer configuration added by this release; do not unload models, clear queues, or delete job state as part of rollback.
5. Re-run the previous-version acceptance set and record the resulting state.

## Explicitly open live gates

- `[ NEEDS CAPTURE ]` Current host, VM, container, service, storage, and GPU state.
- `[ NEEDS CAPTURE ]` Accepted live-to-Git disposition for all four repositories.
- `[ NEEDS CAPTURE ]` Immutable deployment artifact identities and rollback identities.
- `[ NEEDS CAPTURE ]` Real service authentication configuration and secret ownership.
- `[ NEEDS CAPTURE ]` Real GPU failure/restart/recovery acceptance window.
- `[ NEEDS CAPTURE ]` Post-deployment browser and API evidence.
- `[ NEEDS CAPTURE ]` Canonical Notion read/write closeout.

No item above may be inferred from local tests or historical deployment records.
