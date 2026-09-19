# Unified Assistant repository scope

Evidence status: **LOCALLY VERIFIED — NOT DEPLOYED**  
Audited: 2026-09-01  
Search boundary: all top-level and nested projects under `F:/Github`, excluding generated dependencies, builds, caches, model storage, and Git internals.

## Writable implementation set — complete and minimal

1. `F:/Github/nexus` — owns the isolated assistant API/UI, conversations, routing, approvals, audit trail, and deployment package.
2. `F:/Github/gpu-broker` — owns the maintained `/v1/jobs` model-compute contract, RTX 3090 scheduling, consumer budgets, job durability, cancellation, and model residency/download policy.
3. `F:/Github/Huxley` — owns Lost in Thought manuscript, sentence, fact, occurrence, contradiction, mutation, and propagation authority.
4. `F:/Github/sovereign-standalone` — owns homelab graph/KB evidence and approved operational execution.
5. `F:/Github/kecktech-dashboard` — owns recovery evidence, cross-repository contracts, deployment gates, acceptance records, and current incident boundaries.
6. `F:/Github/kecktech-infrastructure` — owns the canonical executable repository registry and future infrastructure/deployment policy. The local registry now includes `nexus` and `Huxley`; this remains not deployed and does not establish live provenance.

No other repository needs modification for the Unified Assistant milestone.

## Read-only reference or optional integration

Responsibility assignments now also follow `docs/adr/ADR-011-fleet-service-ownership-and-resilience.md` and the canonical `F:/Github/kecktech-infrastructure/inventory/service-ownership.json`. These assign accountability, not runtime enforcement. Argo is a separately observed research orchestrator on VM115; its implementation is not added to the assistant writable set. Planned Pi A resilience and Pi B backup custody do not transfer application data ownership.

- `open-webui` — optional diagnostic/freeform surface. Its LiT documentation already treats RAG collections as a working interface rather than LiT authority. It is not a required deployment dependency.
- `me-manager` — downstream LiT publishing and GPU Broker consumer. It does not own assistant knowledge or GPU scheduling.
- `asset-forge`, `forge`, `cleaner`, `voice-clone-service` — GPU Broker consumers useful for compatibility patterns; they are outside the assistant change boundary.
- `app-manager` — prior project ideation/orchestration attempt. It contains a broker client but is not the accepted assistant shell.
- `sovereign-archive` — historical provenance explicitly marked non-authoritative; read only when resolving history.
- `kecktech-wiki`, `Dashboard`, and repository documentation mirrors — operational context only; they do not own this implementation.

## Explicitly excluded attempts

- `Future Ideas/hey-louis` — superseded direct-Ollama IDE/assistant experiment.
- `my-kb` — plan-only product knowledge-base concept with no implementation relevant to the two authoritative domains.
- `character-me` — unrelated portfolio/RPG concept.
- `nexus-forge` — development-workflow scaffolding, not runtime orchestration.
- Other `Future Ideas` applications — independent product ideas or generic AI consumers, not assistant authorities.

## Scope-change rule

Adding another writable repository requires evidence that it owns one of: assistant orchestration state, homelab truth, fiction truth, model scheduling, executable infrastructure policy, or canonical deployment/recovery evidence. Merely consuming an LLM, using Ollama, mentioning agents/RAG, or publishing LiT output is insufficient.
