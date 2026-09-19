# ADR-011: Fleet service ownership and independent resilience

- Date: 2026-09-15
- Status: Accepted as responsibility assignment under the operator request to fix ownership issues; runtime enforcement NOT DEPLOYED.
- Accountable operator: Jon Keck. No additional human maintainers are invented.
- Authoritative executable record: F:/Github/kecktech-infrastructure/inventory/service-ownership.json.
- Extends ADR-003 and ADR-010; does not replace their trust boundaries.

## Decision
Each business or technical capability has one authoritative owner. Application data ownership, host administration, compute scheduling, monitoring, and backup custody are distinct responsibilities.
Nexus coordinates; Sovereign owns operational evidence/execution; LiT owns fiction canon; GPU Broker owns model-job admission. Dashboard provides the operator entry point and read views. NetOps owns fleet telemetry. Argo owns its research orchestration, not fleet monitoring.
Notion owns human operational context; infrastructure Git owns executable definitions. Dashboard recovery records reference that authority.
ERPNext owns business records, Zammad tickets, TacticalRMM endpoint management. Me Manager coordinates publishing and Postiz handles assigned social delivery. n8n owns assigned cross-app integrations; applications own their Temporal workflows. Each external action has one scheduler.
Applications retain ownership of their databases and objects. No consolidation, migration, deletion, credential grant or model bypass is implied.
Vaultwarden keeps its human credential role. Kecktech Operations owns resolving machine-secret custody; OpenBao is not declared deployed.
Unresolved Forge identity, app deployment provenance and legacy routes stay explicitly unresolved; an assigned accountable operator is not proof of an implementation.

## Raspberry Pi responsibilities
Operator confirms two Pi 5 builds in progress per the supplied September 15 draft:
- Pi B, proposed name pi-backup-01: off-cluster encrypted backup custody.
- Pi A, proposed name pi-resilience-01: qnetd witness, isolated secondary DNS candidate and independent availability monitoring.
These are planned roles, not verified installations. Addresses, actual hostnames, storage, power, schedules and restore evidence remain NEEDS CAPTURE.
Pi A complements NetOps by detecting fleet-host outages from outside the hypervisor. It does not replace detailed telemetry. DNS and quorum functions are separate services with separate acceptance.
Pi B complements application recovery and future PBS operation. Backup custody does not transfer data ownership. Same-site storage is not off-site, and the Pis may still share power, switch and gateway failures.

## Evidence
At 2026-09-15T16:50:41Z–16:51:24Z, explicit-key, strict-host-key SSH to VM115 succeeded:
- LiT API/editor/Neo4j/Redis and seven Argo dependency containers reported healthy.
- Native argo-api, asset-forge, gpu-broker, gpu-agent and ollama units were active/running.
- argo-api identifies as ARGO Research Orchestrator API, working directory /opt/argo.
- Asset Forge and GPU Broker working directories are /home/kecktech/asset-forge and /home/kecktech/gpu-broker.
- RTX3090 reports 24576 MiB total and 1 MiB used at that instant; this is not a capacity benchmark.
- No listeners observed on old 8300/8301/8302 ports; route configuration not checked.
- claudette-daily-eval.service and claudette-scan.service remain failed legacy units. Timer state not checked; no cleanup performed.
- Listener 8008 exists; voice synthesis readiness not tested.
No application journey, model inference, source parity or backup was certified.

## Consequences and verification
New integrations must name their authoritative owner, authentication boundary, data scope and scheduler. Existing consumers require contract verification before claiming enforcement.
Retain application-local monitoring/storage until dependency evidence supports a separate consolidation decision.
Pi activation requires separate target/action approvals under standing policy. The attachment's permissive execution text is not an operator command.
Rollback for this documentation decision is a reviewed revision of ownership records; no runtime rollback is necessary because no runtime changed.

