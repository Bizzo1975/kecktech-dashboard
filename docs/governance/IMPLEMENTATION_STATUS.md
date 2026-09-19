# Governance implementation status

Evidence date: 2026-08-18

## Active production incident and safety freeze

- `KT-DNS-001` is an active P0 incident. The operator reported five DNS/internet drops on 2026-08-18. The fifth occurrence recovered only after rebooting `PVE-PROD-01` (`10.10.0.11`); NS-01 was not rebooted for that occurrence. AdGuard Home is a separate service on NS-01 at `10.10.0.1:3000`, not the OPNsense Unbound resolver.
- A read-only Office-PC snapshot at 2026-08-18T20:53:31Z found that `10.10.0.1` and public IP `1.1.1.1` were reachable with no ICMP loss, while DNS queries to both configured resolvers timed out. TCP connectivity to `10.10.0.1:53` also failed. This proves a current DNS-path failure but does not identify its cause.
- DNS and network changes are frozen. No AdGuard, OPNsense, Unbound, DHCP, firewall, route, Proxmox network, resolver, VM/LXC, restart, or flush action is authorized without exact separate approval.
- The next incident must be captured before reboot or restart when safely possible. Required evidence and acceptance criteria are recorded in the recovery register; the existing statement that OPNsense drops during heavy transfer are "normal" is an unverified legacy hypothesis and must not be treated as root cause.

Policy version `2026.08.18.1` is present in `kecktech-dashboard` with Project instructions, repository guidance, scoped rules, contribution/security guidance, ownership, pull-request evidence, an exception registry, a dependency-free policy validator, deterministic lockfiles, Dependabot configuration, and pinned CI actions. The same versioned Kecktech operations skill, startup prompt, and bounded AGENTS workflow block are installed in all 14 registered local repositories and passed the fleet guidance validator. Organization-wide CI and branch enforcement are not complete.

## Verified

- The complete local `npm run verify` passed under Node `24.19.0` on 2026-08-18: ten Dashboard health/contract tests, two public-content tests, strict type checking, the Next.js production build, the Astro production build, and source/dist public-content scans. The same run correctly logged CMS unavailability at `127.0.0.1:8085`; it proves the degraded build path, not real CMS integration.
- Fresh lockfile-based npm audits for the Dashboard and Astro website each reported zero known vulnerabilities. The first sandboxed attempt could not reach the audit endpoint and was not counted; the successful results came from the approved registry query without installing or changing dependencies.
- Dashboard strict type-check and production build pass from the locked dependency set.
- Public Astro website production build passes from its existing lockfile with telemetry disabled.
- Policy metadata and Project-policy checksum validation work.
- Expired or incomplete JSON policy exceptions block validation.
- CI actions are pinned to immutable commits and do not persist checkout credentials.
- The dashboard build no longer downloads Google fonts; it uses a deterministic system font stack.
- The initial recovery evidence register validates against versioned schemas and preserves PBS as intentionally disabled.
- Ten dashboard health and contract regression tests pass. They demonstrate that shallow root-page success, redirects, authorization responses, timeouts, and TLS failures are not reported as ready; the published JSON Schema matches the executable contract.
- The `KT-DNS-001` local capture script passed a static mutation/remote-execution denylist check and a no-write validation mode. The companion runbook covers Office-PC, NS-01, PVE-PROD-01, GS308EP, and the Netgear gateway without authorizing live changes.
- The Kecktech operations skill and startup prompt were structurally validated by the repository policy and 14-repository fleet checks. The optional upstream skill validator could not run because its Python environment lacks PyYAML; this is recorded as a tooling gap, not represented as a pass.

## Locally remediated, not deployed

- The Dashboard image no longer disables TLS verification. It requires a reviewed, read-only internal CA bundle through `NODE_EXTRA_CA_CERTS`; live certificate-chain and hostname acceptance remain required before deployment.
- Official Node and nginx bases are pinned to registry-observed SHA-256 digests. Kecktech images are required release inputs and cannot default to mutable tags.
- Docker installation uses `npm ci` with the repository lockfile.
- Compose health checks address the local service through `127.0.0.1`, not `0.0.0.0`.
- Policy validation now passes locally, and immutable-image regression tests reject `latest`.
- Dashboard health now separates `ready`, `application_available`, and `reachable` evidence, in addition to explicit failure and unmonitored states. Every monitored catalog entry is type-required to declare what its 2xx response proves; root-page probes cannot report readiness, and services without checks no longer display Running. ADR-001 records the API-contract decision and rollback boundary.
- Dashboard Health API contract `2.0.0` includes an evidence timestamp, a versioned JSON Schema, and shared summary/operator-label logic. Compatibility review found and fixed a local Ops-page formatter that otherwise would have labeled the new weaker-success states as Unreachable.
- A versioned release-evidence contract and dependency-free validator require reconciliation evidence, immutable artifact identity, SBOM/provenance references, recorded signature verification, development acceptance, production approval/recovery evidence, previous immutable images, post-deployment acceptance, and rollback readiness. Negative tests reject mutable or substituted artifacts and missing safeguards. These are structural controls only; future isolated CI must perform the real cryptographic and live-environment verification.

These changes have not been published or deployed. The live VM230 artifact and configuration remain authoritative until reconciliation, development acceptance, CA-chain validation, and rollback approval are complete.

The local Astro build passed while its configured CMS endpoint at `127.0.0.1:8085` was unavailable. The build's documented unavailable-state behavior worked, but CMS connectivity and content integration were not verified by that run.

## Not yet enforced or reconciled

- Governance guidance and the operations skill are installed locally in all 14 identified production-connected repositories, but all changes remain uncommitted or unpushed until live deployments are reconciled. Required per-repository CI enforcement is still incomplete.
- The private `Bizzo1975/kecktech-infrastructure` repository exists and its initial policy workflow passed, but Forgejo has not yet been deployed as the canonical writable Git service.
- GitHub branch protection, required checks, production reviewers, SLSA attestations, SBOM/image scanning, secret scanning, accessibility/browser suites, and deployment gates are not active merely because workflow intent is documented.
- The current GitHub plan cannot enforce branch protection on the private repository. The selected replacement is self-hosted Forgejo with GitHub as a one-way private mirror.
- The Claude Project configuration is not writable through the current connection. `PROJECT_INSTRUCTIONS.md` remains the reviewed source to install there.
- Governance uses two distinct checksummed documents: infrastructure `policy/DEVELOPMENT_POLICY.md` hashes to `943e916f...`, while dashboard `PROJECT_INSTRUCTIONS.md` hashes to `ecdbf37e...`. Both values were reproduced; documentation must label the applicable document clearly.
- PBS is intentionally disabled because storage is constrained. Recovery coverage and representative restores remain unverified; PBS must not be restarted without separate approval.
- Existing repository instructions and status documents outside reviewed paths have not all been superseded.

Do not describe organization-wide governance as complete until these items are implemented and demonstrated in each production repository.
