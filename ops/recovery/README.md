# Infrastructure recovery evidence register

Evidence baseline: `2026-08-18`

This directory is the versioned, machine-readable companion to the Kecktech Notion operational record. It does not replace Notion and it does not authorize production changes.

## Safety state

- The verified live deployment is the operational baseline until each service is reconciled with Git.
- Application deployment, repository cleanup, destructive work, credential changes, DNS changes, authentication changes, and production database mutation remain prohibited without their specific approvals.
- PBS is intentionally suspended because storage is constrained. Do not start, reconfigure, prune, or create jobs on PBS without separate approval.
- An `unknown` or `unverified` state must never be rendered as healthy.

## Files

- `issues.json` records verified findings, decisions, unknowns, gates, acceptance criteria, and required approvals.
- `issues.schema.json` defines the required structure.
- `services.json` is the initial service/host evidence index. It is intentionally incomplete and marks unverified facts explicitly.
- `services.schema.json` defines the service index structure.
- `repositories.json` records the read-only local Git snapshot and live-reconciliation state.
- `repositories.schema.json` defines the repository snapshot structure.
- `deployments.json` records sanitized live artifact, Git-state, disk, and mount evidence without secret values.
- `deployments.schema.json` defines the live-deployment evidence structure.
- `live-capture-manifest.json` records hashes and exclusions for Git-ignored source captures without committing production source or credential values.
- `VM230_RECONCILIATION.md` compares the existing VM230 captures with both local checkouts, records contradictions and missing provenance, and proposes—but does not accept—a canonical disposition.
- `PROVENANCE_GAP_MATRIX.md` turns the 13 completed deployment metadata records into a dependency-ordered targeted capture queue without repeating broad discovery.
- `CMS_LOCAL_REMEDIATION.md` records the atomic-publication/security work that passes locally and the restored lint/type gates that still block release.
- `validate-register.ps1` validates both registers without changing them.

## Evidence rules

1. Preserve the exact observation and its UTC timestamp.
2. Record the evidence source without copying secrets or private data.
3. Use `unknown` when current evidence is missing.
4. Do not close an issue until every acceptance criterion has current evidence.
5. Keep rollback and approval requirements attached to the issue.
6. Update Notion from a reviewed register change; fetch the current Notion page immediately before writing.

## Current blockers

- Live-to-Git reconciliation is incomplete for every production-connected repository.
- Several hosts and services remain inaccessible or unverified.
- The canonical personal and Jacob repositories are under `F:/Github/Running Apps`; similarly named top-level or temporary copies are not authoritative unless later proven otherwise.
- Recovery coverage has not been proven. PBS is intentionally off and is not an incident.
