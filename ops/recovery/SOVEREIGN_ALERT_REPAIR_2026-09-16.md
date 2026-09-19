# Sovereign evaluator repair — 2026-09-16

## SQL follow-up deployed September 17

**Scheduled light acceptance passed:** read-only capture at 06:19:25 UTC confirms the natural light run exited 0 at 06:06:52 UTC, generated a fresh parseable report at 06:06:52.769219 UTC, and has no populated error fields. Nightly's latest report still predates the SQL deployment, so nightly acceptance remains pending its September 18 02:30 UTC run. No operational mutation occurred during this check.

Jon approved the one-line validation SQL repair. Deployed at **2026-09-17 06:02:02 UTC**, after confirming no concurrent source changes and both evaluators idle. Only `daily/alert_evaluator_light.py` changed: `ran_at`/`$days` became `ts`/`$1`. The nightly evaluator imports the same function.

Five regressions pass against the locally applied repair. A direct call to the deployed validation function using a database connection with `default_transaction_read_only=on` returns `checked=true`, 1 run, 100% pass rate, `below_threshold=false`; this confirms the SQL defect is fixed without invoking an evaluator, graph writes or notifications. This one-run sample does not establish broad application validation coverage.

Live/local SHA-256: `accc99be55bb470e6cac13110cc87afbf7b6deb0f699a39ababb549e8c505ccc`. Protected rollback copy: `/var/backups/kecktech-recovery/sovereign-validation-query-20260917T060202Z`; original hash `62f6acc549e615f052db0dfa294c35a7ec5ea482fd6fd55053ac40bde1bd53aa`, ownership 1000:1000 and mode 0644 preserved. Evidence: `sovereign-sql-deployment-2026-09-17.json`, `sovereign-sql-live-check-2026-09-17.json`.

Scheduled report acceptance after the SQL deployment remains pending. Earlier scheduled success below proves the timestamp repair only. No service restart or manual evaluator execution occurred. Approval's narrow work-item scope covers this source file and its regression test only, with baseline check, backup and real read-only verification as controls; owner/approver Jon, September 17, ending at repair acceptance or September 18. Normal slice requirements apply to subsequent work.

Status: VERIFIED LIVE — timestamp repair scheduled-run acceptance passed. At September 17 05:42:29 UTC, light's latest run exited 0 at 05:35:37 UTC with a fresh parseable report, and nightly exited 0 at 02:56:29 UTC with a fresh parseable report. Both executions occurred after deployment at 00:39:50 UTC. Both retain the separate pre-existing validation query error; overall evaluator health remains degraded.

Both reports retain `.validation.error`, also present before deployment. Subsequent read-only diagnosis confirmed invalid `$days` binding and nonexistent `ran_at`; the tested one-line `$1`/`ts` candidate awaits exact deployment approval. See `ASSISTANT_PREPARATION_2026-09-16.md`. Follow-up heartbeat `verify-sovereign-scheduled-evaluators` is paused after scheduled-run acceptance; no manual evaluator run occurred.

## Approved deployment outcome

Jon explicitly approved the narrow work item and three-file deployment, then requested a fresh check for Claude's changes. Local and live files were rechecked before deployment; live originals still matched the two approved baseline hashes. Only the reviewed patch was applied. Unrelated work was preserved.

Original files, ownership, modes and manifest are preserved under `/var/backups/kecktech-recovery/sovereign-alert-json-20260917T003950Z` (directory mode 0700). The helper was installed first, then each evaluator replaced atomically with ownership/modes retained. All deployed SHA-256 hashes matched local reviewed files. Evidence: `sovereign-alert-deployment-2026-09-16.json`.

Four regression tests pass locally and against the actual deployed helper using VM122's installed Neo4j library. Repository policy validation passes. No service was restarted and no evaluator manually invoked. The light evaluator's 00:27:45 UTC success predates deployment and is NOT acceptance evidence for this repair. Next observed schedules: light 00:42:36 UTC, nightly 02:30 UTC September 17. Both need post-deployment success and report validation before closing evaluator acceptance.

Approval covers this repair scope only; unrelated Sovereign UI/Prometheus and broader provenance remain separate work. Approved-slice administrative exception is limited to these three source files plus the regression test, approved by Jon September 16; owner Jon/Kecktech Operations; compensating controls are exact live/local baseline match, reviewed patch, four real-driver regressions, protected rollback copies and scheduled-run validation. Exception expires at this repair's acceptance or September 18, whichever comes first; future changes return to the normal slice workflow.

## Verified scope

Both local evaluator files exactly match live `/opt/sovereign` SHA-256 values:

- `daily/alert_evaluator.py`: `3cabc2a69bde536cf4f659dec2772b5cd45d1c9262ae93ae6eeb1106539c291e`
- `daily/alert_evaluator_light.py`: `731b1b0c9693cbb8ebfda975cbf5bcda78fe974653dc23cddc8f36c85eeb7e56`

The light service's latest inspected execution still exited 1. The confirmed failure is JSON serialization of Neo4j DateTime in evaluator reports.

## Prepared change

`sovereign-alert-json.patch` adds `app/alert_report_serialization.py` and changes the two report serialization calls to use its explicit timestamp adapter. Date, Time and DateTime retain ISO representation and DateTime nanosecond precision. Unknown non-JSON objects still raise errors. It does not change graph evaluation, notification policy, scheduling or credentials.

Four isolated in-memory tests passed using `/opt/sovereign/.venv/bin/python -B -`: original failure reproduced; nested timestamp and UTC offset preserved; supported date/time types converted; unknown object rejected. No evaluators ran, database connections opened, notifications sent or remote files written by these tests. This is adapter evidence, not end-to-end evaluator acceptance. Repository policy validation passed.

## Exact approval scope

Approve this narrow repair as a Sovereign work item (or explicitly waive the approved-slice requirement for this repair), apply the reviewed patch and regression test locally, then deploy only the two named evaluator files and new helper on VM122. Before deployment, recheck baseline hashes, preserve the original files and permissions in a protected rollback directory, and verify deployed hashes. Abort if either baseline changed.

No manual evaluator execution or service restart is included. After installation, observe the existing scheduled light/nightly runs and report timestamps/status; do not claim end-to-end acceptance until both succeed and report contents are checked. On regression, restore the two exact originals and remove only the newly deployed helper after verifying its deployment hash.

The build rules require a queue unit backed by an APPROVED slice. The existing alert queue match is an already-completed UI item, not this repair; no queue status or locked documentation was changed.

## Nexus prerequisites checked

The assistant entry point binds loopback port 8787. The repository-root defaults are Windows paths. No assistant Docker/systemd deployment package was found in the targeted filename search. Deployment requires an explicit Linux repository allowlist, persistent state directory/permissions, service and access design, existing domain credentials verified without disclosure, authenticated contract tests and approved model availability. Prior host-only provisioning is not application readiness. These prerequisites remain open; this repair does not deploy Nexus.
