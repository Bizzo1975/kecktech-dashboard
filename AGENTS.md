# Kecktech Repository Instructions

Policy version: `2026.08.18.1`
Project policy SHA-256: `ecdbf37e53cd1d59957c928b3342104c045d87f79ccc3d181586a3aa7592a6d1`
Canonical development policy SHA-256: `943e916f42855fdcc42bf3f685c4c47106131547c629ec592748323a1e3db21d`

The mandatory development policy is [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md). Read it before planning, editing, testing, or deploying. Project instructions override repository-local guidance; local rules may be stricter but may not weaken them.

Use the repository skill at [.agents/skills/kecktech-operations/SKILL.md](.agents/skills/kecktech-operations/SKILL.md) for Kecktech infrastructure, operations, reconciliation, deployment, incident, or knowledge-base work.

## Session boot and knowledge

- Fetch the latest Notion Daily Handoff, canonical Infrastructure Recovery & Development Governance Execution Plan, Known Issues, and relevant Environment Brain pillars before operational work.
- Reuse the completed 2026-08-16 fleet audit and 2026-08-18 deployment captures. Do not repeat broad discovery; perform targeted delta verification only for changed, contradictory, provenance-missing, or acceptance-critical facts.
- Classify evidence as VERIFIED LIVE, OPERATOR CONFIRMED, LOCALLY VERIFIED — NOT DEPLOYED, DOCUMENTED — NEEDS REVERIFY, CONTRADICTED, or [ NEEDS CAPTURE ].
- Update the canonical Notion page and executable repository records when verified architecture, ownership, dependency, deployment, recovery, security, or troubleshooting facts change.
- Fetch immediately before each Notion write and verify by readback. Present the complete Daily Handoff draft before writing it.

## Active incident boundary

While KT-DNS-001 is active, do not change, restart, reload, flush, or reconfigure AdGuard, OPNsense, Unbound, DHCP, firewall, VLAN, routing, switching, Proxmox networking, VMs/LXCs, or resolvers without exact separate approval naming the target and action.

## Repository boundaries

- `dashboard/` contains the operations dashboard and public Kecktech website.
- `ops/` contains operational documentation and scripts. Treat scripts as production-affecting until proven otherwise.
- Preserve dirty worktrees and unrelated changes. Never reset, force-push, overwrite, or mass-format them.
- Notion is the human operational source of truth. Code and deployment definitions must still match verified live behavior.

## Required behavior

- Inspect the affected implementation and its real dependencies before changing it.
- Never add production stubs, mocks, placeholders, simulated success, fake health, or silent fallback.
- Test doubles belong only in isolated test code.
- Validate external input and enforce authorization on the server.
- Never disclose or commit secrets. Credential and destructive operations require the approvals defined by the Kecktech Operations instructions.
- A fix needs a regression test. A production change needs rollback and post-change validation.
- Do not call a change complete until applicable policy checks pass and evidence is current.
- Live-to-Git reconciliation must be accepted before any production deployment.

## Local verification

Run from `dashboard/`:

```powershell
npm run verify
```

Run repository policy checks from the repository root:

```powershell
pwsh -NoProfile -File tools/policy/validate-policy.ps1
```

<!-- BEGIN KECKTECH OPERATIONS POLICY 2026.08.18.1 -->

## Kecktech operations workflow

Policy version: 2026.08.18.1  
Project instructions SHA-256: ecdbf37e53cd1d59957c928b3342104c045d87f79ccc3d181586a3aa7592a6d1  
Canonical development policy SHA-256: 943e916f42855fdcc42bf3f685c4c47106131547c629ec592748323a1e3db21d

Load .agents/skills/kecktech-operations/SKILL.md for infrastructure,
operations, incidents, deployment, live-to-Git reconciliation, or Notion work.
Read PROJECT_INSTRUCTIONS.md before planning, editing, testing, or deploying;
it is the identical universal policy in every production-connected repository.
Reuse the completed 2026-08-16 fleet audit and 2026-08-18 deployment captures;
perform only changed, contradictory, provenance-missing, or acceptance-critical
verification. Treat live production as authoritative until reconciliation is
accepted, preserve dirty work, and never overwrite live state with older Git.

While KT-DNS-001 is active, make no DNS, router, firewall, VLAN, switch,
Proxmox-network, VM/LXC, resolver, restart, reload, or flush change without exact
separate approval. PBS remains intentionally suspended for storage constraints.
Fetch Notion immediately before each write, read it back afterward, and present
the complete Daily Handoff draft before writing it.

<!-- END KECKTECH OPERATIONS POLICY 2026.08.18.1 -->








