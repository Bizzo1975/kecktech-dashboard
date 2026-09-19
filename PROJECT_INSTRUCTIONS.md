# Kecktech Project Instructions

Policy version: `2026.08.18.1`  
Effective: 2026-08-18  
Applies to: all Kecktech agents, production-connected repositories, infrastructure, documentation, and operational work.

## Authority and sources of truth

These instructions are universal and non-negotiable. Repository rules may be stricter but may not weaken them. Notion is the human operational source of truth; the future private `kecktech-infrastructure` repository is the executable policy and infrastructure source. Verified live behavior wins when documentation and deployment disagree, and the disagreement must be recorded and reconciled.

Before planning or changing behavior, inspect the current code, deployment, documentation, and current official guidance. Use NIST SSDF 1.1, OWASP ASVS 5.0 Level 2, SLSA 1.2 Build Level 2, WCAG 2.2 AA, and CISA secure-by-design/default as minimum baselines.

## Truth and evidence

- Never claim working, healthy, complete, tested, or production-ready without current evidence.
- Never replace missing implementation with a stub, mock, placeholder, simulated response, fake status, hard-coded demo result, or silent fallback.
- Test doubles are allowed only in isolated tests and must not enter production artifacts or execution paths.
- If a dependency is unavailable, fail clearly or show an honest unavailable state.
- Never weaken tests, expected results, security checks, type checks, or acceptance criteria to obtain a pass.
- Documentation and dashboards must reflect observed behavior and include an evidence timestamp.

## Change discipline and approvals

- Read repository guidance and inspect affected paths before editing.
- Preserve dirty worktrees and unknown production changes. Never reset, overwrite, force-push, or mass-format unrelated work.
- Keep changes reviewable and scoped to one coherent outcome.
- Record an ADR for architecture, authentication, data ownership, public contracts, deployment topology, or stack changes.
- Update code, tests, schemas, runbooks, service catalog, and documentation together when applicable.
- Every production change requires a rollback method and post-change validation.
- Do not change a password, token, key, or credential without approval naming the credential and replacement value or approved generation method.
- Do not delete or destructively recreate containers, volumes, VMs, LXCs, databases, routes, or data without explicit approval of the exact targets.

## Kecktech operational invariants

- Notion is the sole session-context source. Fetch the latest Daily Handoff and relevant Brain pages before infrastructure, VM, IP, auth, DNS, domain, site, CI/CD, or open-issue work. Never ask the operator for facts available there.
- Claudette is retired. Do not use or recreate Claudette workflows. Treat any residual unit or container only as cleanup pending explicit approval.
- Known Issues / Cleanup Backlog is the task source. Maintain one Daily Handoff per date and present the full handoff draft before writing it.
- For Notion: no write without mandate; fetch before every write; replace rather than append; do not create a page without approval; write verified facts only; mark unknowns `[ NEEDS CAPTURE ]`; never write while debugging.
- Never change pricing without operator confirmation. Never put client data outside approved Kecktech systems.
- `jacob-roman.com` is anonymous. Never publicly associate it with Jon Keck or Kecktech.
- Atlas receives no development time until ADR-070 and its revenue gate are explicitly reverified.
- Never modify `expected_answer` or `expected_keywords` in `eval_harness.py` without approval in the same operator message. Fix implementation or data, not expected results.
- Never write directly to LLDAP `users.db`; use the supported binary or UI. Before destructive identity work, inventory and confirm all users. Verify service-held values before changing credential configuration.
- Before restarting identity, edge, or authentication containers, assess blast radius. Restart with the least-destructive supported operation; stopping or removing requires explicit approval.
- Use the SSH execution and ProxyJump patterns from the latest verified Operations runbook, with the explicit fleet key and direct Tailscale IP. Do not copy a stale IP table into code or policy.

## Design, security, and privacy

- Prefer the simplest complete design. Maintain clear ownership and one authoritative source per fact.
- Validate all trust-boundary input with typed or schema-validated contracts.
- External calls and workers require explicit timeouts, bounded retries with jitter where safe, cancellation, idempotency, and observable failure.
- Do not swallow errors. Preserve causal context while redacting credentials and private data.
- Separate business logic from transport, UI, persistence, and vendor adapters.
- Preserve public compatibility unless an approved versioned migration and rollback exist.
- Apply least privilege, deny by default, secure defaults, defense in depth, and complete mediation.
- Enforce authentication and authorization on the server. UI visibility is not authorization.
- Never place secrets in source, images, logs, command output, browser bundles, health responses, fixtures, or documentation.
- Use parameterized database operations, contextual output encoding, applicable CSRF protection, and rate/abuse controls.
- Minimize personal data, classify it, redact logs, and define retention.
- Pin, scan, support, and license-check dependencies, actions, tools, and base images.
- Critical exploitable vulnerabilities block release. High findings require remediation or an approved expiring exception.

## Definition of done

A change is complete only when observable acceptance criteria exist and applicable unit, integration, contract, migration, security, accessibility, browser, deployment, and rollback tests pass. Cover invalid input, unauthorized access, dependency failure, timeout, retry, duplicate requests, stale data, and recovery where relevant. Defect fixes require regression tests. Real integrations require isolated testing against compatible real services; mocks alone do not prove readiness. Builds must be reproducible from clean checkout and locked dependencies. Monitoring, logging, backup, migration, and rollback behavior must be verified. No known production stub, placeholder, skipped critical test, fake status, or unresolved acceptance item may remain.

## Exceptions

No silent exception is valid. An exception must name the rule and affected service, explain the business need and risk, list compensating controls and tests, identify owner and approver, and include creation, expiration, and remediation dates. Expired exceptions block release. “Legacy,” “temporary,” and “works on this host” are not standing exceptions.
