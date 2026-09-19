# ADR-003: Unified Assistant trust boundaries

- **Status:** Accepted for local implementation
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED
- **Date:** 2026-09-01

## Decision

The Unified Assistant is a coordinating application, not a new source of operational or fiction truth. Nexus owns operator authentication, conversations, routing decisions, proposal approvals, and an append-only audit trail. Sovereign owns homelab evidence and operational execution. Lost in Thought owns manuscript evidence and canon mutation/propagation. GPU Broker owns all model scheduling through `/v1/jobs`.

Every network boundary is independently authenticated. Nexus uses separate read and write credentials for each domain; read credentials cannot execute proposals. Domain responses are untrusted input and must satisfy the versioned contract before display or model use. The UI is never an authorization boundary.

## Required controls

- Bind the local milestone to loopback. Any external exposure requires a separately accepted edge and identity design.
- Reject missing, expired, modified, reused, cross-domain, or revision-mismatched proposals.
- Require `manuscriptId` on every LiT evidence and mutation request; require the same ID on every returned fiction citation.
- Treat Sovereign observations as historical/stale until a post-recovery capture establishes currentness.
- Canonicalize repository paths, enforce an explicit root allowlist, reject traversal/symlink escape, cap file size and result count, and never index ignored private/runtime paths.
- Send only cited, bounded evidence to a model. Model output is prose only and cannot create facts, citations, approval state, or execution authority.
- Attribute model output to a durable GPU Broker job ID. Direct Ollama, OpenAI, or Anthropic access from Nexus is forbidden.
- Keep cloud routing disabled by default. Enabling it requires an approved policy identifying allowed data classes and providers.
- Keep model downloads disabled by default. A future download request must identify an allowlisted immutable model, expected bytes, license, free-space result, retention effect, and explicit approval.
- Apply bounded timeouts, cancellation, idempotency keys, retry limits, token/VRAM/disk budgets, and observable terminal failure at every external call.

## Threats explicitly addressed

- Prompt content attempting to override evidence or approval policy.
- Cross-manuscript or cross-domain data disclosure.
- Stale infrastructure evidence presented as current health.
- Forged citations or model-generated provenance.
- Direct provider bypass around GPU scheduling and storage controls.
- Approval replay, expiry, tampering, confused-deputy execution, and lost audit state.
- Repository path traversal, symlink escape, oversized-file exhaustion, and secret ingestion.
- Dependency outage or malformed response silently converted into apparent success.

## Consequences

Read-only assistance remains available when execution is disabled. Domain or model outages produce explicit unknown/unavailable states. Deployment can proceed in read-only stages, and proposal execution can be enabled independently per domain only after reconciliation and acceptance.
