# Fleet and AI portfolio review — 2026-09-15

## Status and limits

**September 17 deployment delta:** Nexus read-only assistant API is now installed on VM125, enabled/active at loopback port 8787. Authenticated domain reads, unauthenticated denial, private state permissions and one restart with preserved conversations passed. Exact immutable release and evidence: `NEXUS_INSTALLATION_APPROVAL_2026-09-17.md`, `nexus-installation-result-2026-09-17.json`. This supersedes the historical VM125 provisioning-only statements below. Domain actions, models and public/UI access are not enabled. Notion update awaits OAuth reauthorization.
### Reconciled portfolio decisions — September 16

**Scope:** portfolio/ownership/dependency review of the captured fleet and September 15 repository audit. This review provides a complete disposition for the captured application groups; it is not a claim that every repository has been code-audited or every integration works. Canonical machine-readable register: `F:/Github/kecktech-infrastructure/inventory/fleet-portfolio-2026-09-16.json`. All 1,512 captured runtime records now have an accountable operational owner and an application grouping or explicit identification gap. These assignments do not establish source parity or data ownership by themselves.

**Operator corrections:** the host crash cause was a full storage pool followed by a failed NIC (OPERATOR CONFIRMED); remove that root-cause investigation from the active queue. Pi builds remain operator-owned and in progress. ERPNext has no customer/client data (OPERATOR CONFIRMED). VM400 is Minecraft, not a generic business-app outage. FarmBot is an unfinished future tool, not a failed completed production product. No deletion, decommission or job replay follows from these classifications.

**Current denominator:** September 16 cluster membership is 36 guests plus template 901; 32 guests running, four stopped. Runtime capture remains dated September 15: 212 Docker records and 1,512 container/unit/timer records. Later ERPNext/Umami Phase B evidence supersedes their old states; VM125 is separately verified provisioned with no app containers or Nexus service. Four stopped guests need internal capture before claiming complete runtime discovery. VM105/117/121/124 documentary entries are absent from current cluster membership and need disposition, not assumed deletion.

#### The AI architecture to implement

- **Nexus / VM125:** assistant conversation, routing, approval state and audit; separate from its older SDLC-factory frontend/backend. Reuse the assistant-api rather than creating another assistant in Dashboard. Host is provisioned; application deployment remains open. Its local repository adapter defaults to Windows paths and API defaults to loopback port 8787: explicitly configure Linux repository mounts, service binding and ingress. Do not copy the workstation configuration into a VM.
- **Sovereign / VM122:** operations evidence and guarded operational actions. NetOps supplies observations; Sovereign reasons over them; Notion remains human canon. Exact live contracts `/v1/evidence/query` and `/v1/proposals/execute` are published as of September 16. This corrects earlier name-based checks that looked for `assistant` in URLs. Contract presence is not authenticated acceptance or source parity.
- **Lost in Thought / VM115:** manuscripts, canon and propagation. Exact live evidence/execution contracts are published. Require manuscript scope for every fiction request. Huxley is the repository name, not a second application. Retired Hub/Session/Claudette must not become a competing canon store.
- **GPU Broker / VM115:** single RTX3090 admission/scheduling boundary through `/v1/jobs`. Local Nexus uses it. Live deprecated `/v1/assign` and `/v1/activate` still publish: inventory consumers before retirement. Local policy currently names Nexus; do not assume every AI app obeys it.
- **Ollama / VM115:** inference engine, not assistant approval or scheduling owner. Current model list is empty. Select approved model identities only after measured GPU and disk budgets. Repository allowlist entries are candidates, not installed models or benchmarked recommendations.
- **Argo:** research orchestration, distinct from fleet observability. Keep its research data under Argo. Treat Argo's embedded monitoring as app-local until scrape/retention consumers prove it can be consolidated.
- **Open WebUI / VM119:** optional freeform model/testing UI. It does not own operational approvals or manuscript truth. Route compute consistently through the broker; never make a parallel privileged assistant.
- **Asset Forge / Voice Clone:** domain-specific media generation, each with its own provenance and privacy controls. Broker owns compute. Voice biometric readiness remains a separate gate.

#### One owner for each workflow

- Fleet observations: NetOps. Operational evidence/actions: Sovereign. Operator landing/read views: Dashboard. Human operating records: Notion. Executable inventory: infrastructure Git.
- Business records: ERPNext. Tickets: Zammad. Device management: TacticalRMM. Dashboard consumes their APIs rather than keeping competing records.
- Content preparation/approval: Me Manager. Social delivery: Postiz. Listmonk is newsletter delivery; define channel ownership so the same campaign is not sent by multiple schedulers. Mattermost is team communication, not the ticket database.
- Cross-app integrations: n8n. Durable internal app workflows: app-owned Temporal. User-approved AI actions: Nexus delegates to the domain owner. Each external action has one scheduler and one idempotency key.
- Web publication: CMS owns managed website content; Dashboard/public website/portal/admin/mailer have distinct presentation or delivery roles. Wiki is reference knowledge, not a second infrastructure inventory. Personal, pseudonymous and business sites retain separate data/identity boundaries.
- Human secrets: Vaultwarden. Machine-secret platform: unresolved under Operations; do not call OpenBao deployed based on a historical VM entry.

#### Disposition for the remaining captured portfolio

- **Keep by function:** ingress/identity, Portainer, NetOps, Vaultwarden, Umami, ERPNext, Zammad, TacticalRMM, n8n, Mattermost, Wiki, CMS, Dashboard and web services. Optimize integration before removing applications.
- **Keep with application-specific scope review:** AeroCAD (design/CAD stack), FloorOS (flooring application; `flooros-mock` requires purpose/exposure verification), MarketList (market-list application; authoritative record scope needs capture), RateMyRack (rack-review app), Mom Hub (private family scope), Cleaner (cleanup automation; execution authority must stay explicit), personal/business/pseudonymous sites, Listmonk, Me Manager/Postiz. Names/deployment metadata establish identity, not full feature readiness.
- **Keep as media/gaming:** Minecraft/Pterodactyl VM400, Conan VM402, Plex LXC501. LXC502 MediaTools is stopped; no inference of retirement. These do not compete with the business assistant; expose only optional read-only status adapters.
- **Future unfinished:** FarmBot. Keep out of production availability scoring and automatic assistant execution until hardware, data, and acceptance boundaries exist.
- **Retired:** Mailcow and Claudette/Hub/Session workflow remnants. Catalog residual containers/units/timers; cleanup needs exact targets. Do not reactivate them for integration.
- **Unidentified:** VM302 `great_hermann` is stopped, has only an image digest, no Compose labels and no exposed ports. Operations owns identification; do not assign a guessed app or delete it.
- **Guest-only/provisioning roles:** KB/PostgreSQL VM116, PBS VM120, Nexus VM125, stopped development guests and template 901 remain in the guest register even where they contribute no named Docker application group. PBS remains operator-suspended; Pi builds are not claimed live.

#### Confirmed overlap versus candidates

Confirmed: duplicate local clones for personal-website-gen and squirrel-mobile-game; duplicate embedded AI-Date-Night candidate; retired Claudette naming/runtime residue. Preserve dirty unique work before selecting canonical clones. Repository audit contains 81 classification rows (some repositories appear in multiple classes), not 81 independent apps. Its original account coverage was 68 GitHub repositories, 60 local Git directories and 17 remote-only repositories; these are different denominators.

Candidate overlaps requiring evidence: Nexus/app-manager/nexus-forge/project-dashboard SDLC roles; Dashboard/control-center operator tasks; Asset Forge/Forge/image-gen-tool/ai-voice-over generation; Me Manager/Postiz/posti-bot/social-media-uploader/brand-builder publication; RustDesk versus TacticalRMM MeshCentral remote access; central versus app-local Prometheus/Grafana. A shared name or technology is not proof of a removable duplicate. Remote-only/source-unmapped candidates remain explicit register gaps.

Do not consolidate PostgreSQL, Redis, Neo4j, MinIO, Elasticsearch or Temporal merely because multiple instances exist. Their app schemas, authorization, retention, failure domains and restore contracts differ. Reuse integrations and compute policy first; only then evaluate storage consolidation from measured cost and recovery evidence.

#### Implementation order and acceptance

1. Sovereign evaluator DateTime repair deployed under explicit approval at 2026-09-17 00:39:50 UTC. Both original files matched the live baseline after rechecking concurrent changes; protected rollback copies and deployed hashes are recorded in `SOVEREIGN_ALERT_REPAIR_2026-09-16.md`. Four real-driver regressions pass. Scheduled-run acceptance is pending; UI/Prometheus being stopped remains separate. No manual evaluator execution or service restart occurred.
2. Reconcile Nexus assistant source, Linux configuration, immutable deployment and rollback on VM125. Verify read-only Sovereign/LiT requests and citation provenance before enabling actions.
3. Configure and verify one GPU consumer policy per app, durable queue/cancellation and model budget; populate an exact model manifest and run representative evaluations. No model download is approved by this review.
4. Integrate the primary daily workflows: NetOps → Sovereign → Nexus; business records/tickets/devices → Dashboard/Nexus read views; approved content → Me Manager → assigned channel delivery.
5. Enforce catalog maintenance from hypervisor/runtime deltas into the canonical register, review queue and Notion. Complete source/data/cron/restore fields rather than hide unknowns. Keep phase acceptance separate from container state.

**Outstanding capture is explicitly bounded:** stopped-guest interiors, cron/scheduled command ownership, full remote-only repository content, per-runtime immutable source parity/actual dependency contracts, unknown VM302 container, and representative authenticated/restore journeys. The portfolio analysis and responsibility decisions are delivered; exhaustive live certification and implementation remain follow-up work.

### Recovery progress — September 15 evening

See `RECOVERY_APPROVAL_BUNDLE_2026-09-15.md` for current execution evidence. Umami completed database-only Stage A. ERPNext has verified cold copies and a successful active-site login/schema check; five-minute acceptance is tracked in `stage-a-200-active-site-2026-09-15.jsonl`. Both application layers remain paused pending Phase B. Portainer agents are restored.

Correction: the initial ERPNext multi-site validator stopped at obsolete `frontend` credentials and never reached the active `ops.kecktech.net` account. Independent checks prove the active account works with its existing credential. Root administration and obsolete-site access remain separate unresolved issues; no password was reset. The validation selector was fixed and regression-tested. Neither database readiness nor schema visibility proves full application acceptance.

### Current reconciliation — 2026-09-15 21:47Z

Claude's September 15 Daily Handoff and updated Known Issues were reviewed. Preserve its offline filesystem-repair history for VM115/VM400 and the unresolved September 14 hypervisor crash-loop. The initial access/usage-limit block described below is historical and no longer prevents targeted SSH verification.

- **VERIFIED LIVE:** VM400 accepts explicit fleet-key SSH. Wings is listening; the game container remains exited since July 23 and no port 25565 listener was observed. Host recovery is not game acceptance.
- **VERIFIED LIVE:** newly provisioned VM125 `prod-nexus-assistant-01`, LAN `10.20.0.125`, has 4 GiB RAM/30 GB disk, Docker installed, zero containers, and no Nexus listener. Do not count this as a working assistant deployment.
- **VERIFIED LIVE:** Proxmox local-zfs utilization is 53.84%, PBS storage 15.14%. The older approximately 90% claim conflicts with this newer reading; reconcile storage identity/accounting before closing capacity concerns. PBS remains suspended.
- **VERIFIED LIVE:** residual Claudette timers are scheduled; failed legacy units are not necessarily inert. Exact approved cleanup remains pending.
- **VERIFIED LIVE:** Ollama reports no installed models. OpenAPI publication for the AI services establishes contract visibility only. LiT's published contract lacks assistant routes; live assistant integration remains unverified.
- **LOCALLY VERIFIED — NOT DEPLOYED:** Nexus assistant API build and 15 isolated contract tests pass. Infrastructure policy newline drift was restored to existing canonical manifest bytes; positive and negative policy checks pass. Neither result proves live integration.

#### Catalog evidence and remaining gaps

`runtime-catalog-2026-09-15.json` preserves the 17:03–17:04Z capture: 36 cluster entities (35 guests plus template 901), 31 running guests inspected, 212 Docker containers and 1,512 total runtime entries including native units/timers. VM125 is a later delta; the earlier count is not a current fleet total. Four stopped guests and the template were not inspected internally. LXC501 has a supported access path and native Plex service; playback is unverified.

The 26-domain ownership register resolves responsibility assignments. Per-runtime application ownership, dependencies, source revisions, backup/restore proof and end-to-end acceptance remain incomplete. Do not interpret all 1,512 units as separate applications or declare the full audit complete.

#### Recovery evidence and action gates

Sanitized diagnostic evidence is in `workload-diagnostics-{200,112,234,400}-2026-09-15.json` (21:47Z). Indicator counts are not a root-cause diagnosis.

1. ERPNext: database, Redis cache/queue, backend and queue workers exited cleanly under `on-failure` policies. Frontend/websocket restart with dependency-error indicators. Prepare recovery of existing containers in dependency order; exclude configurator/create-site. Before execution, capture consistent recovery evidence, exact container targets, rollback and database/application acceptance. Exact start approval remains required.
2. Umami: database exited cleanly; app restarting. Existing database-first recovery needs the same data/recovery checks and exact target approval.
3. FarmBot: six containers exited 255 on August 18 with restart policy `no`, without OOM. Database-error indicators need investigation. Robot-connected actions require a defined physical safety boundary before any recovery.
4. VM400: existing game container exited 1 in July, no OOM. Determine the application-specific exit cause and panel-managed recovery before proposing a start; do not recreate it.
5. Model provisioning, assistant deployment, DNS/network changes, credential rotation and PBS activation remain separately gated. User owns both Raspberry Pi builds.

Canonical Known Issues was updated and read back with these deltas. Claude's Daily Handoff was preserved; any handoff write requires presentation of the complete draft first.

### Follow-up at 2026-09-15T16:51:24Z
VM115 reachability is now VERIFIED LIVE through explicit-key SSH. LiT and Argo dependency containers report healthy; native Argo, Asset Forge, GPU Broker/agent and Ollama are active. Argo identifies as a research orchestrator, correcting the earlier observability-only description. RTX3090 is visible. This supersedes the earlier access block and unreachable-host statements below for VM115 only; application journeys and source parity remain unverified.

Ownership assignments are recorded in `docs/adr/ADR-011-fleet-service-ownership-and-resilience.md` and canonical `F:/Github/kecktech-infrastructure/inventory/service-ownership.json`. The operator is building Pi B for backup custody and Pi A for independent resilience; neither is claimed deployed. Corrective plan integration is in `F:/Github/kecktech-infrastructure/runbooks/pi-resilience-plan-integration.md`. Historical analysis below is retained with this dated correction.

**DOCUMENTED — NEEDS REVERIFY. This review is incomplete.**
This is a reconciled documentary baseline, not a live certification. No SSH, service restart, configuration change, deployment, model download, or database action occurred. Automatic approval review blocked reading the SSH configuration and managed visual-report directory because of an account usage limit. A visual report could not be produced through the required managed location.

Loaded: repository policy and operations skill; latest handoff linked from Daily Handoffs (August 18); canonical execution plan; Known Issues (September 15); VM Registry (September 15); Physical Infrastructure (September 15); Operations & Runbooks; Live Sites & Applications; local recovery registers, September 15 reconciliation records, assistant scope, and Nexus/LiT/GPU Broker documentation.
The highest-priority recorded incident remains KT-DNS-001. Its current resolution has not been established.

## Catalog coverage
The companion JSON preserves 36 rows from the canonical VM inventory, including its hypervisor row. **This is not 36 verified guests or a complete fleet count.** Additional documented entities omitted from that main table include LXC105 and development VMs 702, 730, and 732. Physical dependencies include PVE-DEV-01, NS-01, Office-PC, the switch, and upstream gateway.
The source's “38 guests” and “37+ fleet” summaries cannot be treated as reconciled totals. A current read-only hypervisor inventory must establish the denominator, including stopped guests and templates.
The local seven-entry services.json is a recovery exception register, not a catalog of all services.

## Documented scope by host
All items below retain historical evidence status; application usability is not certified.

- VM100: Traefik ingress, Authelia authentication, LLDAP directory; cloudflared is native. Shared identity/edge dependency.
- VM103: Vaultwarden, human password management.
- VM104: Portainer, container administration.
- LXC105: Infrared game proxy in the DMZ; native/service details need capture.
- VM110: retired Mailcow; retain recovery/retirement record and resolve stale routes.
- VM111: n8n automation. Inventory active workflows, schedules, credentials by reference, and consumers without exposing values.
- VM112: Umami analytics. Registry suggests healthy; August 18 recovery evidence records failure. Current state unresolved.
- VM113: RustDesk remote access; compare exact operator use with TacticalRMM/Mesh.
- VM115: Ollama, GPU Broker, Asset Forge, LiT, Argo dependencies, legacy Brain/Hub/Session routes, and native Voice Clone. September 15 records report network-unreachable. Claudette retired; conflicting residual routes are not permission to recreate it.
- VM116: PostgreSQL/pgvector knowledge storage. Confirm database ownership and consumers; do not confuse it with the public wiki.
- VM117: named for SillyTavern, application absent from recorded Docker check. Native processes and intended purpose remain unknown.
- VM119: Open WebUI, freeform/diagnostic model interface; optional in accepted assistant scope.
- VM120: PBS; backup schedules intentionally disabled. Guest free space and host pool free space are separate constraints.
- VM121: named for MinIO, application absent from recorded Docker check. Intended shared asset role and native deployment need verification.
- VM122: Sovereign homelab evidence/graph/operational domain; native API with Postgres, Neo4j, Redis, MinIO. Editor/Prometheus recorded exited; evaluator failures not rechecked.
- VM123: NetOps, Grafana, Loki, Prometheus, Alertmanager, Uptime Kuma, InfluxDB, Blackbox, ntfy, PVE exporter. Monitoring/alerts, not the business transaction authority.
- VM124: named for OpenBao; empty Docker check does not prove absence of native secrets service.
- VM200: ERPNext business operations. September 15 records show stopped dependencies and frontend/websocket restart loops.
- VM210: Zammad support tickets; ticket-intake spam and dashboard integration are recorded gaps.
- VM220: TacticalRMM/Mesh endpoint management.
- VM230: dashboard, CMS, admin UI, mailer, client portal, marketing website, Marketlist web/API/database. Distinct services require distinct records. Portal September 15 process-health note supersedes older unhealthy note only at that evidence layer.
- VM232: public help/wiki. Separate from internal operational canon and private AI knowledge.
- VM234: FarmBot physical automation; recorded prolonged partial outage. AI control needs a domain-specific approval boundary.
- VM240: FloorOS database/platform; full application deployment and consumer mapping missing.
- VM241: Cleaner repository utility; read-only source access acceptance remains open.
- VM242: Mom Hub family application, API and ClamAV. Health does not resolve documented authentication/scanning design concerns.
- VM243: AeroCAD frontend/backend plus MinIO, Temporal, Elasticsearch, Postgres, Redis. Identify workflow and data isolation needs before sharing infrastructure.
- VM302: personal website.
- VM303: Me Manager publishing/workflows, Postiz social scheduling, Temporal and data dependencies.
- VM304: pseudonymous publishing site. Preserve separate public identity, credentials, publishing review, and assistant retrieval permissions.
- VM320: RateMyRack community application; frontend/worker acceptance unresolved.
- VM400: game backend, recorded network-unreachable.
- VM401: game-business marketing site and native nginx/CtrlPanel.gg; depends on VM400 for truthful game availability.
- VM402: Conan Exiles candidate. **CONTRADICTED:** August 18 records active native conanexiles.service and UDP listeners; September 15 empty Docker inventory cannot establish retirement or reclaimability.
- LXC501: Plex; actual native unit and data mounts need capture.
- LXC502: Music Assistant, Audiobookshelf, Kavita, Bazarr, Calibre-Web, qBittorrent, Radarr, Prowlarr, Lidarr, Sonarr. Catalog separately with shared mounts and permissions.
- VM702/730/732: development website/dashboard/wiki. Hypervisor and Tailscale documentation disagree; current guest and application state missing.
- Office-PC: documented secondary GPU role and local development. GPU Broker README describes an RTX2080; current presence, VRAM, availability, and contention are not verified.

## AI architecture: documented boundary
The accepted local scope assigns:
1. Nexus: assistant interface, conversations, routing, approvals, audit trail.
2. Sovereign: homelab evidence and approved operational execution.
3. Lost in Thought (Huxley repository): manuscript/codex facts, occurrences, contradictions and propagation.
4. GPU Broker: maintained /v1/jobs compute contract, budgets, durable jobs, cancellation and model policy.
5. Dashboard: cross-repository recovery/deployment/acceptance records and operational entry point.
6. Infrastructure repository: executable inventory and governance.

These are locally documented boundaries, not proof of deployed integration. September 15 reconciliation records explicitly say assistant files are absent from live Sovereign and Nexus has no accepted deployment record.

LiT is a fiction studio with separate original-object, graph and text-evidence responsibilities. Its codex establishes authorial truth; chapter prose cannot silently overwrite it. A general assistant or Open WebUI retrieval collection must not become an independent source of manuscript truth.

## Conflicts and duplicate candidates
### Confirmed documentary conflicts
- VM402 empty-host inference versus native game-service evidence.
- GPU Broker README emphasizes /v1/assign and browser-held key workflow; accepted assistant scope requires /v1/jobs. Consumer-by-consumer contract verification is necessary.
- Nexus README describes a broader SDLC factory and local Ollama/Open WebUI stack; current assistant scope is narrower. Avoid launching a second model stack from old instructions.
- LiT canon retires Hub/Session, while VM115 registry still lists those routes as active components.
- Registry still contains old portal unhealthy detail alongside newer process-health correction.
- Physical infrastructure retains older incorrect VMIDs despite corrected main VM registry.
- PBS guest space improvement does not remove the host pool constraint or establish restore coverage.

### Candidates requiring evidence, not immediate removal
- Dashboard, NetOps, Nexus and Open WebUI: multiple surfaces can be useful, but define one purpose each and link between them.
- Argo, Sovereign Prometheus and central monitoring: potentially redundant metrics infrastructure; inspect actual scrape targets, retention and consumers first. “Argo” is not proven to be Argo CD or solely an observability application.
- MinIO, Postgres, Redis, Neo4j, Elasticsearch and Temporal instances: same software does not imply duplicate data. Share only after ownership, version, performance, backup and isolation requirements are established.
- Vaultwarden versus OpenBao: candidate human-password versus machine-secret roles; not equivalent merely because both store secrets.
- n8n versus Temporal versus assistant tools: define event integrations, durable application workflows, and user-approved actions separately.
- ERPNext, Zammad, TRMM, portal: transaction/system ownership versus presentation must be explicit. Dashboard should display authoritative records rather than create competing customer/ticket/device stores.
- Me Manager/Postiz/other social tools: determine which owns content, approval and delivery; prevent duplicate scheduled publication.
- RustDesk versus Mesh/TRMM: measure actual remote-access needs before retaining both.
- SillyTavern/MinIO/OpenBao VMs: “purpose/application not captured” until native inspection proves otherwise; no savings claim from allocated RAM alone.

## Recommended efficiency design — proposal, not accepted architecture
- One assistant entry point in Nexus, linked from the operations dashboard.
- Separate read-only domain adapters first: Sovereign for operations, LiT for fiction, existing business apps for their own records.
- One compute admission contract through GPU Broker for AI consumers. Validate all direct Ollama/provider bypasses before enforcing it.
- Treat interactive text, batch indexing, image generation, transcription and voice synthesis as separate job classes; use measured priorities and memory limits.
- Keep browsing and non-AI app functions available when compute is down. Fail AI requests explicitly or queue them visibly; no silent cloud fallback.
- Establish a model manifest with exact model/version/digest, quantization, context limit, measured peak VRAM, embedding dimension, license, approved data classes and test results.
- Changing embedding models needs versioned indexes and a reindex/rollback plan.
- Put budgets, deadlines, cancellation, idempotency, audit records and approval requirements on tool calls.
- Keep business, family/medical, fiction and pseudonymous data in separate authorized retrieval scopes. Never pool them merely to make the assistant knowledgeable.
- Use central monitoring as the default fleet view; retain local monitoring only where an app needs independent operation.
- Maintain one authoritative inventory in the infrastructure repository with human explanation in canonical Notion pages and dashboard views generated from it.
- Defer consolidation/migration until backups and representative restores are proven.

## Practical integration opportunities
- Operations: NetOps alerts → Sovereign evidence → Nexus explanation → reviewed action through the owning operational adapter.
- Support: Zammad ticket → authorized device evidence from TRMM → draft troubleshooting → operator approval → ticket update.
- Business: ERPNext owns business records; portal/dashboard read them through validated APIs.
- Publishing: LiT approved material → Me Manager review → Postiz scheduled delivery; external publication stays explicit.
- Assets: approved request → Asset Forge/Voice Clone → GPU Broker job → owned asset storage → app consumer.
- Family/media: restricted app-specific queries; media playback/catalog queries can remain outside private family records.
- Physical automation: FarmBot remains separately controlled; assistant recommendations do not imply autonomous actuation.

## Full application portfolio remains open
The September 15 Git review records 60 local Git directories and 68 GitHub repositories, including 17 remote-only repositories. Repository count is not application count.
This review has not inspected every application's implementation. The Git reconciliation plan supplies the candidate list: active development, dormant ideas, duplicate clones, local-only and remote-only projects. Include all in a portfolio register with lifecycle and hosting status, without pretending every repository is deployed.
Atlas remains gated by ADR-070/revenue verification. No development recommendation overrides that gate.

## Completion requirements
For every host: hypervisor identity, guest type, lifecycle, owner, allocated and measured resources, access result, source timestamp.
For every service: canonical ID, business purpose, host/runtime, exact process/container identity, source/deployment provenance, listeners/routes, dependencies/consumers, data owner/class, recovery/restore evidence, health evidence layer, schedules, AI use, GPU/model policy, and keep/integrate/retire decision.
Inspect Docker including stopped containers, native service units/timers, scheduled tasks/cron, listening processes, LXC workloads and development hosts. Avoid environment dumps, raw secrets, database contents and private documents.
Reconcile observed guest IDs against catalog IDs in both directions and record unreachable targets explicitly. Every observed runtime needs an owner or an unresolved entry.
Then verify representative end-to-end user journeys; power state, Docker health and HTTP 200 are insufficient.
Write back canonical corrections only with immediate prefetch and readback; present a complete handoff draft before any handoff write.

## Next evidence queue
1. Restore tool access and perform targeted live checks for catalog contradictions and missing coverage.
2. Current hypervisor guest denominator; LXC105/501/502 and development coverage.
3. Native service verification on VM402, 117, 121, 124; no retirement based on Docker alone.
4. VM115 and VM400 console observation; exact separate approval for any state-changing recovery.
5. Per-runtime catalog and dependency mapping, especially VM115/122/123/230/303.
6. Every repository's purpose and actual runtime linkage, including remote-only applications.
7. GPU consumption, queue behavior, model inventory and direct-provider bypass map.
8. Current backup coverage/restore evidence and measured resource use.
9. Reviewable ownership/consolidation decisions, canonical Notion corrections, and approved handoff.

## Sources
- [VM Registry](https://app.notion.com/p/35192bae832281d6ad06eef5dae7e30b)
- [Known Issues](https://app.notion.com/p/3be92bae832281ee8feec4954b217a7e)
- [Execution Plan](https://app.notion.com/p/3c092bae8322815da9eef17b349a79d3)
- [Physical Infrastructure](https://app.notion.com/p/35192bae83228166a039c48cdd8f93d5)
- [Live Sites](https://app.notion.com/p/3be92bae83228114986ec3c7e7a17bd6)
- Local: UNIFIED_ASSISTANT_REPOSITORY_SCOPE.md; UNIFIED_ASSISTANT_LIVE_RECONCILIATION_2026-09-15.md; FLEET_GIT_RECONCILIATION_PLAN_2026-09-15.md; services.json; Huxley/docs/LIT.md; Nexus and GPU Broker README files.
