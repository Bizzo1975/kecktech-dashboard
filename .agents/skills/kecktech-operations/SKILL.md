---
name: kecktech-operations
description: Prime, research, reconcile, implement, verify, and document Kecktech infrastructure and production-connected repository work. Use for Kecktech operations, incidents, deployments, live-to-Git reconciliation, governance, DNS/networking, VMs/LXCs, services, sites, demos, or Notion knowledge maintenance.
---

# Kecktech operations

Policy version: 2026.08.18.1

## Prime

1. Read the active repository AGENTS.md and applicable nested rules.
2. Fetch the latest Notion Daily Handoff, the canonical Infrastructure Recovery & Development Governance Execution Plan, Known Issues, and relevant Environment Brain pillars.
3. Report loaded sources, the highest-priority issue, approval boundaries, and contradictions.

## Evidence

- Reuse the completed 2026-08-16 fleet audit and 2026-08-18 deployment captures. Do not repeat broad discovery.
- Reverify only changed, contradictory, provenance-missing, or acceptance-critical facts.
- Classify facts as VERIFIED LIVE, OPERATOR CONFIRMED, LOCALLY VERIFIED — NOT DEPLOYED, DOCUMENTED — NEEDS REVERIFY, CONTRADICTED, or [ NEEDS CAPTURE ].
- Treat live production as authoritative until accepted live/local/remote reconciliation exists.
- Never record or expose secret values. Preserve private data, biometric material, databases, models, generated media, and runtime state outside source control.

## Change control

- Preserve dirty worktrees and unknown live changes. Never reset, overwrite, force-push, or deploy older history over live state.
- Credential, destructive, deployment, restart/reload, network/DNS, VM/LXC/container, database, runner/Forgejo, and PBS operations require the exact approvals in Project instructions.
- While KT-DNS-001 is active, no AdGuard, OPNsense, Unbound, DHCP, firewall, VLAN, route, switch, Proxmox-network, VM/LXC, resolver, restart, reload, or flush mutation is authorized without exact action-and-target approval.
- PBS remains intentionally suspended because storage is constrained.

## Implement and verify

- Inspect real code, deployment evidence, dependencies, and official guidance before changing behavior.
- Never use production stubs, mocks, placeholders, simulated success, fake health, silent fallback, weakened checks, or changed golden answers.
- Fixes need regression tests. Production changes need immutable identity, development acceptance, recovery/rollback evidence, approval, and post-change validation.
- Do not claim completion from process/container state, shallow HTTP success, mocks alone, or documentation alone.

## Knowledge closeout

- Update existing canonical Notion pages and executable repository records when verified facts change.
- Fetch the target immediately before each Notion write; replace the exact affected region; read back and verify.
- Mark unknowns and contradictions instead of guessing. Never duplicate a source of truth.
- Present the complete Daily Handoff draft for operator approval before writing it.
- A work item is incomplete while its code, service catalog, ownership, deployment record, recovery procedure, runbook, or acceptance evidence is stale.

For a portable session-start prompt, read [references/startup-prompt.md](references/startup-prompt.md).
