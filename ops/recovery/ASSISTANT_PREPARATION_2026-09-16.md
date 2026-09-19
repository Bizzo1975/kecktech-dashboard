# Sovereign diagnosis and Nexus deployment preparation

**September 17 update:** Sovereign's one-line SQL repair was explicitly approved and deployed at 06:02:02 UTC. Five regressions pass; the actual deployed function succeeds against a write-disabled live DB connection. Scheduled report validation remains pending. See `SOVEREIGN_ALERT_REPAIR_2026-09-16.md` for hashes/rollback/evidence. The candidate/approval wording below records the earlier preparation phase.

Evidence captured September 17 UTC / September 16 Central. Notion handoff, Known Issues, canonical plan and Operations refreshed. Claude's current source was inspected; no resets, pulls or broad replacements. Nexus unrelated dirty backend/frontend work preserved.

## Sovereign — verified cause and review-ready repair

Live `validation.error` is `syntax error at or near "$"`. The light evaluator's SHA-256 still equals deployed `62f6acc549e615f052db0dfa294c35a7ec5ea482fd6fd55053ac40bde1bd53aa`.

Read-only live PostgreSQL transactions proved two defects: `$days` is invalid for asyncpg positional binding, and `ran_at` does not exist. The real timestamp column is `ts`. Original query raises PostgresSyntaxError; parameter-only correction raises UndefinedColumnError; correcting both succeeds with 1 run/1 pass in the seven-day window.

Candidate patch `sovereign-validation-query.patch` changes one line in `daily/alert_evaluator_light.py` to `WHERE ts >= NOW() - make_interval(days => $1)`. The nightly evaluator imports this same function. Five isolated regressions pass: no data remains unknown, minimum-run threshold respected, passing rate computed, query failures visible, missing pool explicit. Actual corrected query was tested against the real DB in a read-only transaction. No schema changes, credentials, evaluator runs or production source writes occurred.

### Exact next approval

Approve this narrow SQL repair work item and deployment of only `/opt/sovereign/daily/alert_evaluator_light.py` on VM122. Apply the candidate and regression locally, recheck the baseline hash, preserve original ownership/mode and a verified rollback copy, replace atomically, verify new hash, and observe existing scheduled light/nightly runs. No manual evaluator execution or restart is included. If the baseline changed, stop and reconcile. Rollback restores the verified original only if the deployed hash still matches, preserving concurrent changes. Sovereign's approved-slice requirement needs this explicit narrow work-item acceptance, as with the preceding timestamp repair.

## Nexus — locally fixed and packaged, NOT DEPLOYED

VM125 `prod-nexus-assistant-01` rechecked: Node is not installed, no Nexus unit and no running Docker containers. Existing local `.env` has domain read/write configuration; only variable presence was reported. Its GPU Broker settings are empty. No credentials were changed or bundled.

Live read-only contracts with existing credentials: Sovereign unauthenticated request rejected (422 for missing header), authenticated request 200 with one well-shaped citation; LiT unauthenticated 401, authenticated 200 with explicit unknown for a deliberately nonexistent manuscript scope. No manuscript contents, mutations, messages or model jobs requested. This is workstation-to-service evidence, not VM125 network-path acceptance or full manuscript validation.

### Persistence defect fixed locally

Eight concurrent conversation creates originally produced 4 apparent successes, 4 failures, and zero surviving acknowledged records. A shared per-file queue now serializes read/modify/write operations in one process; message appends load current state inside that queue rather than overwrite a stale conversation snapshot. Failures release the queue. Source hashes were checked before edits.

Changed only assistant `src/store.ts`, `src/service.ts`, package test script and new `src/test/store.test.ts`. All 26 tests pass. Repeat concurrency probe: 8/8 succeed and persist. Actual local HTTP process rejects unauthenticated access, accepts operator access, creates eight conversations concurrently and retains all eight after restart. No live state involved. Multiple writer processes and host-crash durability are not proven; proposed unit runs one process. Proposal execution concurrency is not accepted; domain write keys must remain absent in the pilot.

### Release candidate

Manifest: `nexus-package-manifest-2026-09-16.json`. Candidate archive is in `.recovery-private/nexus-preparation/`; runtime JavaScript, package metadata and proposed service/preflight only. Excludes credentials, state, tests, node_modules and unrelated apps. Source rehashed before/after compilation to reject concurrent edits. Package build uses installed toolchain; a fresh dependency-lock install and Linux execution have not yet been proven.

Proposed Linux layout:

- Immutable release: `/opt/nexus/assistant/releases/<artifact-id>`; `current` points to accepted release.
- Reviewed runtime: `/opt/nexus/runtime/bin/node`, Node 24.19.0 (not yet installed or Linux artifact verified).
- Root-controlled configuration: `/etc/nexus/assistant.env`; reuse approved existing read credentials securely. Operator-token provisioning/custody still needs review; do not generate or rotate silently.
- Persistent state: `/var/lib/nexus-assistant`, service-owned 0700 directory and 0600 state file.
- Read-only repository snapshots: `/srv/nexus/repos/...`, exact contents/permissions and provenance must be accepted. No Windows path fallback.
- Loopback port 8787. Initial access requires an approved SSH tunnel or later approved proxy; no firewall/DNS changes proposed here.
- `DynamicUser`, read-only filesystem, protected state directory, no capabilities. Service preflight rejects write keys, model configuration and cloud execution for initial pilot.

### Deployment acceptance still required

1. Verify/download approved Linux runtime and locked clean build provenance; review service unit on VM125 before installation.
2. Prepare exact Linux snapshot allowlist and protected environment from existing credentials; never copy local `.env` wholesale because it includes write keys and Windows settings.
3. Verify read contracts from VM125, state permissions and process restart persistence on Linux.
4. Review complete artifact/rollback target, then obtain exact installation/start approval. No deployment approval is requested until these are concrete.
5. After a successful read-only pilot, separately validate proposal execution concurrency/idempotency, model availability/GPU policy and real operator journeys before enabling those capabilities.

Rollback plan: stop only the new Nexus service, preserve state as private data, restore prior release pointer/configuration if present and restart only a previously accepted service. On first installation, leave stopped and preserve all evidence/state. No database, snapshot or state deletion.

## Next execution order

Deploy the separately approved Sovereign SQL patch; continue Linux Nexus release/preflight work; preserve the existing nightly acceptance monitor. ERPNext queue execution, Pi builds, Minecraft recovery and retired-unit cleanup are unaffected by this preparation.
