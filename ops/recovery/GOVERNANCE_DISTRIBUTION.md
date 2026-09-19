# Kecktech governance distribution status

Status: **LOCALLY VERIFIED — NOT COMMITTED, PUSHED, OR ENFORCED REMOTELY**  
Evidence time: 2026-08-18T23:12:40Z  
Policy version: `2026.08.18.1`

No production, DNS, network, credential, database, VM/LXC, container, or
deployment state changed.

## Canonical distribution source

`F:/Github/kecktech-infrastructure` is the local canonical distribution source.
The 14 production-connected repository paths remain registered in
`ops/recovery/repositories.json`; the policy repository is validated in addition
to those 14 and is not misclassified as a production deployment.

## Identical universal files

The fleet validator requires byte-for-byte equality with the canonical policy
repository for:

- `PROJECT_INSTRUCTIONS.md`
- `.cursor/rules/api-data.mdc`
- `.cursor/rules/containers-deployment.mdc`
- `.cursor/rules/kecktech-operations.mdc`
- `.cursor/rules/operations-scripts.mdc`
- `.cursor/rules/typescript-web.mdc`
- `.agents/skills/kecktech-operations/SKILL.md`
- `.agents/skills/kecktech-operations/references/startup-prompt.md`

Every repository also has exactly one identical managed block in `AGENTS.md`,
`CONTRIBUTING.md`, and `SECURITY.md`. Repository-specific guidance is preserved
outside those blocks and may be stricter. Every repository has `CODEOWNERS` and
a pull-request template.

## Verification

`Test-KecktechFleetGuidance.ps1` now fails for a missing file, stale policy
version, shared-file hash drift, a missing or duplicated managed block, managed
block content drift, a missing ownership/template file, or a stale operations
skill. The installer completed a second idempotency pass using the policy
repository as its source. The fleet validator then passed for all 14 registered
production-connected repositories plus the canonical policy repository.

The dashboard policy validator and recovery-register validator also pass.

## Remaining enforcement work

This proves local distribution consistency only. It does not prove that the
files are committed, reviewed, pushed, protected by CI, or active in deployed
artifacts. Repository-specific CI commands, exception validation, secret scans,
SBOM/provenance, branch protection, and immutable delivery remain pending the
accepted live-to-Git reconciliation and Forgejo/runner work. A generic workflow
was not copied into repositories that cannot yet support its commands.

The universal policy portion is now implemented as the same self-contained,
exact-manifest workflow in every repository. It remains local and uncommitted,
so remote enforcement is still open. Application-check capability and blockers
are recorded separately in `CI_CAPABILITY_MATRIX.md`.
