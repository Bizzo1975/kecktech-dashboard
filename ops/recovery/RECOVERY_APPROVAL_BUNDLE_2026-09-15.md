# Recovery approval bundle — September 15, 2026

Status: Stage A and temporary Portainer-agent stop/restore APPROVED by the operator. Execution results below supersede the historical preflight note.

## Phase B — OPERATOR ACCEPTED COMPLETE, September 16

Operator explicitly directed: "Phase B can be marked completed." The phase is closed by operator acceptance, not by additional live test evidence. ERPNext and Umami startup, local authorization boundaries and Umami local synthetic ingestion were verified. Authenticated browser journeys and public tracker delivery remain unverified follow-ups. The 56 ERPNext jobs remain preserved with workers/scheduler paused; phase closure does not authorize their execution. Root administrative access and obsolete frontend-site cleanup remain open. No service state changed for this status update.

Next work: prioritize host/DNS resilience and restore viability; decide ERPNext backlog/scheduling disposition; finish remaining workload recoveries; reconcile AI deployment and runtime ownership/provenance. User owns Raspberry Pi builds.

## Phase B extended validation — September 16 13:58Z

Real browser requests for both public login URLs reached the expected Authelia sign-in page. This supersedes interpreting VM-side Cloudflare 403 responses as proof of a public outage. Post-authentication routing and application user journeys remain unverified because both browser tabs require operator sign-in. The operator has been asked to sign in directly, without sharing passwords in chat.

Umami ingestion passed: one explicitly labeled synthetic event `phase_b_validation_20260916_135836` on existing `kecktech.net` property returned HTTP 200 and was independently found exactly once in `website_event`. Path `/__ops_validation__/phase-b`; no personal data included. The event remains identifiable in analytics; it was not deleted. Evidence: `phase-b-umami-ingestion-2026-09-16.jsonl`. This tests local collection/persistence, not public tracker delivery through Authelia.

All 56 ERPNext jobs were classified through pickle opcode inspection (no object deserialization or execution). References include outbound email campaigns/reports, accounting/depreciation/revaluation, personal-data deletion, backup cleanup, external Plaid synchronization, stock reorder and routine maintenance. These are potential effects; whether each has eligible business records was not inferred. Workers and scheduler remain stopped, jobs preserved. Evidence: `phase-b-queue-review-2026-09-16.json`. Starting workers indiscriminately would release materially different actions; no outbound messages or destructive jobs were authorized or run by this validation.

Remaining blockers to complete Phase B: operator signs in to both preserved browser tabs so authenticated reads/permissions can be checked; public tracker-path validation; explicit disposition of the reviewed background workload before worker/scheduler enablement. Do not mark Phase B complete from startup, sign-in-page visibility or one ingestion event alone.

## Phase B execution — September 16, approximately 13:50Z

After exact operator approval, all five named ERPNext containers started in dependency order: Redis cache, Redis queue, backend, websocket and frontend. Redis PING checks passed; active-site `/api/method/ping` returned pong through the frontend. All five remained running after the startup observation. The database was preserved.

Umami's 19 migration files were rechecked against the applied ledger: no pending, unfinished or checksum-mismatched migration. Existing `umami` started and `/api/heartbeat` returned 200. No image was pulled or container recreated.

Local HTTP acceptance: ERPNext `/login` 200, unauthenticated current-user and User-resource endpoints 403; Umami `/login` 200, heartbeat 200, unauthenticated `/api/websites` 401. These prove local startup and selected unauthenticated authorization boundaries, not authenticated user journeys or full application readiness.

Public HTTPS checks from VM200 returned 403 with `server: cloudflare` for both login URLs. The cause may be an access/WAF restriction and is not established by this response alone. No proxy/DNS/security policy was changed. Public browser access and authenticated application validation remain open.

ERPNext long queue contains 56 jobs. Both workers and scheduler remain paused pending job-purpose/side-effect review; no queued jobs were executed by this work. Initializer containers remain stopped. Portainer agents and both databases remain running.

Evidence: `phase-b-erpnext-approved-2026-09-16.jsonl`, `phase-b-umami-approved-2026-09-16.jsonl`, `phase-b-route-queue-checks-2026-09-16.jsonl`. Startup portion is complete; full Phase B acceptance remains incomplete. Next: authorized browser login/read journeys, public 403 classification, approved synthetic Umami ingestion, then queue review before enabling background work.

## Phase B preflight — September 16

User requested Phase B. Automatic approval review rejected the attempted start of five ERPNext containers because the active incident policy requires separate exact target/action approval. No application startup occurred. Do not bypass that rejection.

ERPNext startup commands were inspected: Redis servers, Gunicorn backend, Node websocket and nginx frontend. Umami starts via `pnpm start-docker`; `check-db.js` invokes Prisma migration deployment. Read-only comparison found all 19 packaged migrations already applied with identical checksums and no unfinished migrations. Evidence: `umami-migration-preflight-2026-09-16.jsonl`. Repeat identity and migration comparison immediately before startup; abort if any migration becomes pending or mismatched.

Exact approval requested: start existing `erpnext-redis-cache-1`, `erpnext-redis-queue-1`, `erpnext-backend-1`, `erpnext-websocket-1`, and `erpnext-frontend-1` on VM200 in that order, plus existing `umami` on VM112 after unchanged migration preflight. Validate dependency responses, active-site routing and application behavior. Approval includes graceful reverse-order stopping of only newly started containers if validation fails; preserve databases and data. ERPNext workers/scheduler remain paused pending queue review. No image pulls, recreations, credential changes or pending schema migrations are included.

## Stage A complete — reverified 2026-09-16 13:43Z

ERPNext's active-site database acceptance passed on September 15 at 22:49:04Z: five minutes of successful queries, no restarts and zero classified startup corruption/error indicators. September 16 recheck confirms the active `ops.kecktech.net` account still passes `SELECT 1`; MariaDB is running and container-healthy after approximately 15 hours. Umami database is likewise running/container-healthy; both application layers remain intentionally stopped, and both Portainer agents are running.

Both databases have completed Stage A and are ready for Phase B application recovery planning/execution under its applicable approval. This does not resolve stale `frontend` site authentication or root administration, prove full application behavior, or establish off-host restore viability. No credential reset was necessary to clear the active-site acceptance blocker. The prior blocked status below is historical and superseded.

## Active-site authentication correction — 2026-09-15 22:45Z

The earlier claim that the active ERPNext site credential was rejected was incorrect. The validation loop short-circuited on the obsolete `frontend` site before attempting `ops.kecktech.net`. Independent per-site checks show `frontend` fails with access denied, while `ops.kecktech.net` authenticates using its existing application-held credential. Configured root credentials and Unix-socket root access remain rejected; these are separate administration issues, not proof the active site cannot connect.

The selector now explicitly requires `ops.kecktech.net` and fails closed when its configuration/password is missing. Three regression tests cover legacy-first ordering, missing active site, and missing active password. Five recovery safety tests and policy validation also pass. No passwords, users, grants or application configurations were altered.

The active account can read schema metadata: 727 tables and both expected core tables (`tabUser`, `tabDocType`) are present. No business rows were read. The five-minute active-account stability check is running; its completion is recorded in the live execution log `stage-a-200-active-site-2026-09-15.jsonl`. This fixes the acceptance procedure; it does not claim full application functionality or root-account repair.

### Remaining after database acceptance

1. Phase B ERPNext: review startup contracts, start existing Redis dependencies/backend/frontend/websocket, then verify authenticated application reads, authorization and public routing. Review pending jobs before enabling queues/scheduler; no outbound action is authorized by database recovery.
2. Phase B Umami: review migration/startup behavior and start existing app, then verify authentication, analytics reads and an approved synthetic ingestion test.
3. Separate cleanup: reconcile root administrative credential custody and obsolete `frontend` site lifecycle. Do not reset, delete or change grants merely to make an unrelated check pass.
4. Fleet work remains: VM400 game diagnosis/recovery, FarmBot physical-isolation and recovery plan, Sovereign failed jobs, AI model/assistant deployment and end-to-end integration, complete runtime ownership/provenance, DNS/host-crash incidents, and Pi off-host backup/restore acceptance. These are not closed by Stage A.

## ERPNext follow-up — 2026-09-15 22:39Z

Operator authorized needed ERPNext recovery steps. Scheduler's live process had a registered SIGINT handler; it exited on SIGINT without force-kill. Frontend and websocket then stopped gracefully. Portainer was temporarily paused and restored with its original identity.

All three cold archives passed source comparison and SHA-256 verification at 22:34Z:
- Database: 268,789,760 bytes; SHA-256 `89732f86fd8184ed5e6806c1819abd071c0573d705409a7e354143ca445dcdbc`.
- Sites: 27,627,520 bytes; SHA-256 `bf4b229ff269bf6210dcec47866934e7b148a9fc35de66d93a321bed8223575b`.
- Queue: 81,920 bytes; SHA-256 `e30ff40145f9313af66734ddfff885e6cb22962f9823ae88e0bbd92eb7bca864`.

Archives and manifest remain protected on VM200 under the approved backup directory. They are same-guest recovery points, not off-host backups.

MariaDB started and emitted readiness without detected corruption, but authenticated acceptance failed. Configured root credentials, existing site-held credentials via loopback and the configured Docker-network address, and local Unix-socket root authentication were rejected. No credential values were printed or changed. Root environment values matched each other; this does not prove they match database-held authentication state. Do not bypass authentication or infer that the application can connect.

Each failed validation attempt gracefully stopped the database. Final VM200 state: database stopped; scheduler/frontend/websocket/backend/queue workers stopped; Portainer restored. Original cold copies were preserved and their hashes reverified before retry. ERPNext is NOT ready for Phase B: credential authority/consumer reconciliation and a separately approved exact credential-recovery method remain required, followed by successful five-minute database acceptance. No database initialization, user alteration or schema migration occurred.

Evidence: `stage-a-200-scheduler-recovery-2026-09-15.jsonl`, `stage-a-200-app-credentials-2026-09-15.jsonl`, `stage-a-200-network-validation-2026-09-15.jsonl`. Five isolated recovery safety regressions and policy validation pass. VM112 database remains running, application stopped, Portainer running with zero restarts on the final check.

## Execution result — VM112, 2026-09-15 22:31Z

Stage A passed. Portainer and Umami stopped gracefully. The protected database archive was created, compared with its stopped source and hashed: 51,200,000 bytes, SHA-256 `8bf0f430920bc50a4ebf858238ab1b26837270891a11047b1e41e44bb290f8f6`. Copy and manifest remain on VM112 under `/var/backups/kecktech-recovery/2026-09-15-stage-a`, with restricted permissions. This is a same-guest recovery copy, not an off-host backup or restore rehearsal.

Existing `umami-db` started, passed repeated authenticated read-only `SELECT 1` checks over five minutes without a restart, and startup log classification found zero corruption/error indicators. `umami` remains stopped as approved. Portainer was restored with original identity. Full application acceptance remains Stage B work.

Evidence: `stage-a-112-with-agent-2026-09-15.jsonl`. Both Portainer agents are restored; VM200 remains blocked by its scheduler graceful-stop timeout.

## Execution result — VM200, 2026-09-15 22:26Z

Portainer was gracefully stopped and target/data/capacity preflight passed. The approved graceful stop of `erpnext-scheduler-1` timed out; no force-kill was sent. Stage A aborted before touching frontend/websocket, creating archives or starting the database. Portainer was restarted and its original container/image/mount identity verified. At 22:28Z the scheduler remained running, database remained exited, and the recovery directory did not exist. A stop request with Docker's infinite daemon timeout can remain pending after the client timeout; recheck state immediately before any subsequent intervention.

Evidence: `stage-a-200-with-agent-2026-09-15.jsonl` and `stage-a-200-final-state-2026-09-15.jsonl`. Four isolated safety regressions pass, including agent restoration on abort, identity drift refusal and no force-kill on graceful timeout. Policy validation passes. ERPNext is not recovered.

## Execution update — 2026-09-15 22:04Z

The operator approved Stage A. VM200 preflight identified `portainer_agent` with a writable bind mount of `/var/lib/docker/volumes`, covering every protected data volume. Targeted read-only inspection confirmed the same mount on VM112. This violates the bundle's no-other-running-container data-mount condition. `node_exporter` mounts the host read-only. NetOps and Portainer also have Docker socket access; a read-only socket mount is not API-level authorization enforcement. No concurrent management operations should run during recovery.

No application container was stopped, no recovery directory/archive was created and no database was started. Two preliminary transport/parsing failures and nondeterministic mount ordering were diagnosed before the writable-mount blocker; mount comparisons now normalize ordering without ignoring fields.

### Exact supplemental approval required

Temporarily gracefully stop `portainer_agent` on VM200 and VM112, execute the already-approved Stage A, then start those same existing `portainer_agent` containers after recovery or abort. Verify their original container/image/mount identities before and after. Portainer management of these two endpoints will be temporarily unavailable. No agent configuration, network or other service changes are included. If either agent does not stop gracefully, abort without force-kill. Preserve the existing Stage A approval and all its data-copy/database validation gates.

## Evidence and scope

Latest September 15 Notion handoff, Known Issues, execution plan and Operations runbook refreshed. DNS incident remains active. Container/image identities, mounts and state were captured at 21:56Z in `recovery-targets-{200,112,234,400}-2026-09-15.json`. Execution must abort on identity, mount, state or concurrent-operator drift. No image pull, recreation, schema migration, credential change, network change or PBS action is included.

Docker documents that `start` starts an existing stopped container; `on-failure` does not recover clean exits or restart a container merely because its daemon restarted. These semantics explain why recovery can use existing containers, but do not establish the original shutdown cause.

Sources: https://docs.docker.com/reference/cli/docker/container/start/ and https://docs.docker.com/engine/containers/start-containers-automatically/

## Stage A — approve quiescence, protected copies and database-only startup

### VM200 prod-erpnext-01

1. Recheck all captured container/image identities and mounts. Confirm no other running container mounts the protected data. Verify databases/workers remain stopped and no operator is recovering this host concurrently.
2. Gracefully stop only `erpnext-scheduler-1`, `erpnext-frontend-1`, and `erpnext-websocket-1`. Use a bounded graceful-stop wait; if a process does not exit, abort rather than force-kill it. Capture which containers were changed.
3. Create a new root-owned mode-0700 directory `/var/backups/kecktech-recovery/2026-09-15-stage-a` on VM200; abort if it already exists. Copy these stopped/quiesced data directories into separate mode-0600 archives preserving ownership, permissions and extended attributes:
   - `/var/lib/docker/volumes/erpnext_db-data/_data` (261,784 KiB allocated)
   - `/var/lib/docker/volumes/erpnext_sites/_data` (27,360 KiB allocated)
   - `/var/lib/docker/volumes/erpnext_redis-queue-data/_data` (76 KiB allocated)
4. Compare each archive to its unchanged source and record SHA-256 checksums locally on VM200. Keep credentials and application data on the guest. Abort on any copy/compare failure. Measure apparent size and free space immediately before copying; require at least twice the measured total plus 2 GiB free. Current guest available space is 66,600,620 KiB; this is preliminary capacity evidence only.
5. Only after copies verify, start existing `erpnext-db-1`. Leave scheduler, frontend, websocket, backend, Redis and queue workers stopped for this stage. Do not start `erpnext-configurator-1` or `erpnext-create-site-1`.
6. Verify database startup and a read-only authenticated `SELECT 1` using existing guest-local credentials without printing values. Observe for five minutes, check restart count and sanitized corruption/error indicators. If credentials or read-only validation cannot be safely established, stop and report incomplete acceptance.

### VM112 prod-umami-01

1. Apply the same identity/mount/concurrent-work checks. Gracefully stop only `umami`; abort instead of force-killing if it does not exit.
2. Create a new root-owned mode-0700 `/var/backups/kecktech-recovery/2026-09-15-stage-a` on VM112, aborting if it exists. Archive `/var/lib/docker/volumes/umami_umami_db_data/_data` with metadata preserved, mode 0600, source comparison and SHA-256 verification. Current allocation is 48,012 KiB; guest available space is 11,599,656 KiB. Apply the same apparent-size/free-space threshold.
3. Start existing `umami-db` only after the copy verifies. Leave `umami` stopped to prevent unreviewed startup migrations and writes.
4. Verify PostgreSQL readiness plus read-only authenticated `SELECT 1` with existing guest-local credentials; observe five minutes and inspect sanitized failure indicators. Readiness alone does not establish application recovery.

### Rollback and limits of Stage A

Approval includes gracefully stopping only a database newly started by this stage if validation fails: `erpnext-db-1` on VM200 and `umami-db` on VM112. Keep application clients quiesced; record the resulting maintenance state. Do not automatically restore archives over data. Restoration is a separate exact-target destructive action requiring an approved procedure.

Cold copies on the same guest are a pre-start recovery point, not an off-host backup or proof of restore viability. Starting a database can write recovery metadata. If startup exposes corruption, preserve both the copy and current files and stop; do not repair or initialize automatically. Stage A intentionally leaves applications in maintenance, so it does not promise full service recovery.

## Stage B — prepare after database acceptance; not authorized by Stage A

ERPNext: inspect existing commands and contracts, start Redis cache/queue and backend, verify authenticated reads and permissions, then frontend/websocket. Review queued jobs and scheduled side effects before enabling workers and scheduler; do not dispatch email or other external actions without their authorization. Verify the intended public route, login, authorized business-record read and dependency health. Any test write requires an isolated approved test record and cleanup plan.

Umami: review the existing image's startup/migration behavior, establish recovery viability, then start the existing app and verify login, authorized analytics reads and ingestion with an approved synthetic event. No schema-change approval is implied.

## VM400 — hold game startup

Existing container `4af0d3b9-0b29-4c2c-ab38-7fb191a1dbca` is stopped. Data is bound from `/var/lib/pterodactyl/volumes/4af0d3b9-0b29-4c2c-ab38-7fb191a1dbca`. It has no Compose project. Capture the actual application exit cause and panel startup contract; preserve game-world data and validate a recovery copy before a panel-managed start. Acceptance must include game protocol response and a permitted client connection through the intended proxy. No generic Docker recreation or network pruning.

## VM234 — hold FarmBot startup

PostgreSQL and delayed-job/log workers are already running. Six other services are stopped; starting messaging/workers can resume queued robot actions. Need operator confirmation of connected hardware and physical isolation, then review pending actions, database health and a supported consistent backup. No MQTT, robot command or worker startup is included in this bundle.

## Other gates

- Raspberry Pi builds remain operator-owned; off-host backup and restore acceptance follow installation.
- DNS and hypervisor crash-loop remain separate unresolved incidents.
- AI model download/deployment, credentials and retired Claudette timer cleanup need separate exact proposals.
- Existing Claude handoff remains intact. This bundle is a repository runbook; no Daily Handoff write has occurred.

## Exact approval text

Approve Stage A of RECOVERY_APPROVAL_BUNDLE_2026-09-15: gracefully pause the three named ERPNext clients on VM200 and Umami on VM112; create and verify the specified protected local data copies; then start only erpnext-db-1 and umami-db, perform read-only database validation, and gracefully stop either newly started database on failure. Leave application clients paused. No other production changes.
