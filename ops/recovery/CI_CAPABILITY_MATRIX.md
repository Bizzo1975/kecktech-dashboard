# Kecktech repository CI capability matrix

Status: **LOCALLY VERIFIED INVENTORY — APPLICATION CI NOT YET ACCEPTED**  
Evidence time: 2026-08-18  
Scope: 14 production-connected repositories

This is a targeted repository inspection and bounded local verification, not a
fleet rediscovery. No dependency installation, production connection, deployment,
or live mutation was performed. Application tests listed below were run only where
their dependencies and data boundaries were verified first.

## Universal policy gate

All 14 production-connected repositories plus `kecktech-infrastructure` now have
the same self-contained `.github/workflows/kecktech-policy.yml`. It uses official
`actions/checkout` v7.0.1 pinned to full tag SHA
`3d3c42e5aac5ba805825da76410c181273ba90b1`, disables persisted checkout
credentials, and runs the repository-local exact-manifest validator and negative
tests. The tag/version was checked against the official actions/checkout release
and Git ref on 2026-08-18.

Every target passed both the positive validator and negative tests locally. The
negative tests prove shared-file drift and duplicate managed blocks fail.

This workflow is local and uncommitted. It is not a required remote check yet.

## Application-check capability

### Ready for isolated command verification

- **kecktech-dashboard:** locked Dashboard and Astro workspaces; both declare
  `verify`. Their complete local verification already passed under Node 24.19.0.
- **forge:** root npm lockfile with declared lint, type-check, test, and build.
  Current execution found 39/39 tests pass against the explicitly configured
  repository-local Prisma `test.db`. Lint fails with two React effect/state errors
  and two warnings. Type checking fails because `src/lib/gpu-broker.ts` specifies
  `ok` twice in one result object. The sandbox-only incremental-metadata write
  failure was separated from this real compiler error by rerunning TypeScript with
  incremental output disabled. Build was not run after blocking lint/type failures.
  Security inspection also found that the browser settings page stores an
  Anthropic API key in `localStorage`, sends it to an unauthenticated provider-test
  endpoint, and the inspected Forge API routes have no application authentication
  boundary. The repository has no verified live deployment mapping. Authentication
  architecture and intended exposure therefore require an ADR/operator decision;
  the lint finding must not be “fixed” by preserving this insecure client-secret
  design.
- **kecktech CMS:** `website/` npm lockfile with declared `verify`; its tests,
  zero-error lint, strict type check, production build, and audit passed under
  Node 24.19.0. Remaining warnings/integration gaps still block release.
- **me-manager:** root npm lockfile with lint, test, and build. Under Node 24.19.0,
  lint completed with no errors and one `next/image` performance warning, an
  explicit non-incremental strict TypeScript check passed, and 21/21 Vitest tests
  passed. No separate type-check command is declared. The production build was not
  run because this checkout contains a local `.env` and the inspected application
  code can consume database and shared-service configuration during execution.
  The existing CI is not acceptable evidence: it uses unpinned major action tags,
  Node 20, dummy database/authentication values, and
  `ME_MANAGER_ALLOW_INSECURE_DEV=1` for the build. A hermetic build configuration,
  explicit type-check script, pinned actions/runtime, and removal of the insecure
  bypass are required before application CI can be accepted.
- **mom-hub:** lockfiles exist for root, web, receipt-pwa, and server. Root and
  receipt-PWA non-incremental TypeScript checks pass under Node 24.19.0. Lint fails
  with 50 errors and 6 warnings. No automated test framework or test command was
  found; `test:app` builds Electron, starts the Vite development server, and opens
  the desktop application, so it is not an automated test gate. Builds were not
  run after the blocking lint result. Security review found fixed fallback service
  tokens and family passwords in production-path source and documentation, plus a
  client-side default token. The API warns about these values but still starts and
  authenticates them. ClamAV connection errors also return a `skipped` verdict.
  Authentication must fail closed and malware-scan failure semantics require a
  reviewed data-flow decision and regression tests before CI can be accepted.
- **unclejons-itgarage-site:** root npm lockfile and declared lint, Jest, build,
  accessibility, Cypress, and performance commands. Under Node 24.19.0, strict
  TypeScript fails across admin and email-service paths. The lint command is not a
  gate because no ESLint configuration is present and `next lint` opens an
  interactive setup prompt. Jest reports 14 failed and 2 passed suites, with 31
  failed and 31 passed tests. The production build explicitly ignores both
  TypeScript and ESLint failures. Two authenticated admin routes contain a fixed
  fallback PostgreSQL credential and refer to an inherited personal-site database.
  Builds, browser suites, and database-backed checks were not run because VM401
  provenance and the heavily dirty checkout remain unreconciled.
- **personal-website-gen:** root npm lockfile with declared lint, Jest, build,
  accessibility, Cypress, and performance commands. Strict TypeScript fails across
  admin and email-service paths. Lint is not configured and opens an interactive
  setup prompt. Jest reports 14 failed/2 passed suites and 18 failed/22 passed
  tests; its configuration contains an unrecognized `moduleNameMapping` key. The
  production build ignores TypeScript and ESLint failures, and two admin routes
  contain a fixed fallback PostgreSQL credential. Worse, active workflows use
  unpinned action tags, mutable branches, direct production/Vercel deployment, and
  an SSH path that hard-resets the live checkout before rebuilding/restarting it.
  No build, browser suite, database call, workflow, or deployment was run.
- **psuedonym-site:** root npm lockfile with format-check, lint, type-check, and
  build. Strict non-incremental TypeScript passes under Node 24.19.0. Lint fails
  with 3 errors and 3 warnings and uses the deprecated `next lint` path; formatting
  fails across 185 files. No automated test command is declared. The Next.js build
  explicitly ignores ESLint failures. Production-path defaults reference a
  Kecktech mailbox and Forge hostname, violating the repository's non-negotiable
  pseudonym separation unless isolated behind a verified non-observable adapter.
  Build, Prisma generation, and database commands were not run because the heavily
  dirty checkout contains local environment configuration and unreconciled schema
  work.

### Blocked on deterministic dependencies or missing declared gates

- **kecktech-wiki:** declares lint, article validation, and build, but has no npm
  lockfile, installed dependency tree, unit/integration test command, or explicit
  type-check command. Direct TypeScript could not start because dependencies are
  absent; installing without an accepted lock would create an unreviewed dependency
  state. The command named `validate:articles` is production-affecting: it reads the
  configured database, updates page review status/notes/timestamps, and writes a
  report. It is not suitable as a read-only CI gate. Active dev/prod workflows run
  on a broad self-hosted runner, hard-reset live checkouts, rebuild/restart Docker,
  and the production path disables SSH host-key verification. None were run.
- **asset-forge:** Python tests exist and pytest is declared, but all ten active
  top-level version constraints are non-exact. In the existing isolated `.venv`,
  48 tests pass and 23 fail. Failures include missing Pillow in the environment,
  lifecycle fixtures rejected by the newer no-empty-kit invariant, GPU exclusivity
  state, manifest expectations, and webhook setup. The web workspace is locked but
  declares only build/dev/preview—no lint, type, or test command. The Python and
  TypeScript clients also lack reproducible locked verification. No GPU, broker,
  worker, model, generated media, or live service was contacted.
- **gpu-broker:** Python tests exist, but all eight top-level requirements are
  non-exact and pytest is not declared in the inspected requirements. With
  dotenv loading explicitly disabled and dry-run/simulated GPU settings forced,
  the existing `.venv` passes 15/15 tests with three deprecation warnings. A
  normal invocation is not isolated: both test modules remove the API-key
  override before `app.py` loads the repository `.env`; the observed first run
  consequently passed 2 tests and failed 13 with unauthorized responses. The
  browser-facing `/v1/ui-bootstrap` route returns the broker API key, while job
  and lease stores are memory-only and cannot provide required restart recovery.
  Tests also exercise deprecated assign/activate/switch paths despite repository
  guidance naming `/v1/jobs` as the maintained contract. The Node client has no
  declared scripts or lockfile. No GPU, broker endpoint, worker, model, VM115,
  credential value, or production service was contacted.
- **cleaner:** the existing isolated `.venv` passes all 6 safety/preflight tests,
  using temporary data and non-secret loopback service overrides. All twelve
  requirements are non-exact, and no declared lint, type, security, packaging,
  API authorization, or destructive-boundary gate was found. More critically,
  the application middleware permits a missing service-key header even when a
  service key is configured, relying on an unverified assumption that such a
  caller passed Traefik/Authelia. This leaves mutation routes—including settings,
  scan creation, change acceptance, push, merge, cancellation, and standards
  deletion—without an application-enforced identity boundary. Low-severity
  changes default to automatic acceptance, and Tier-0 can delete and commit files
  inside a cloned workdir. No repository, remote, model, broker, VM, mount,
  credential value, or production service was contacted.
- **sovereign-standalone:** Python 3.11+, pytest configuration, Ruff configuration,
  extensive tests, and locked hub/session UI workspaces exist. Top-level Python
  requirement sets remain largely non-exact, the UI workspaces declare only
  build/dev/preview, and the extremely dirty evidence-locked worktree requires
  bounded execution rather than a broad automatic cleanup.
- **voice-clone-service:** Python tests and pytest exist, but all eight counted
  requirements are non-exact. Real inference/biometric acceptance cannot run in
  general CI and must remain a separately controlled integration gate.

## Required implementation sequence

1. Execute existing checks without changing dependencies, one repository at a
   time, and record current pass/fail evidence.
2. Add explicit supported runtime versions and deterministic dependency locks
   where missing; never generate a lock from unreviewed live-only behavior.
3. Add missing lint, type, test, build, security, and contract commands in bounded
   repository-specific changes with regression evidence.
4. Add application CI only after its exact commands pass locally from the locked
   state. Do not copy a generic application workflow across incompatible stacks.
5. Keep real-service, browser, GPU, biometric, migration, recovery, and deployment
   acceptance as isolated gates with appropriate secrets and approvals.
6. After live-to-Git reconciliation, publish reviewed branches and make the
   universal policy check plus proven application checks required in Forgejo.

## Honest boundary

Uniform governance enforcement is implemented locally. Uniform application CI is
neither technically correct nor claimed: the repositories have different stacks
and several lack deterministic dependencies or required commands. Those gaps are
release blockers, not reasons to insert placeholder checks or pretend coverage.
