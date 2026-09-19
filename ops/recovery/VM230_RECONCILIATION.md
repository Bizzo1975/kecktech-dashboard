# VM230 live-to-Git reconciliation

Status: **IN REVIEW — no canonical disposition accepted**  
Evidence date: 2026-08-18  
Policy: `2026.08.18.1`

This record uses only the existing August 18 deployment metadata and sanitized
source captures. VM230 was not contacted and no Git, deployment, DNS, container,
credential, database, or production state was changed during this comparison.

## Three preserved states

1. **VERIFIED LIVE at capture time:** VM230 shared worktree `/opt/docker`, branch
   `dev`, HEAD `47aa2c8efd37c00b20de553463cc922dc597491a`, with recorded dirty and untracked
   files. Running image IDs are in `deployments.json`.
2. **Existing remote-tracking state:** workstation `origin/dev` is the same commit
   as the captured live HEAD. No fetch was performed, so this is the previously
   recorded remote-tracking state, not a current remote observation.
3. **LOCALLY VERIFIED — NOT DEPLOYED:** dashboard checkout HEAD
   `7d623c53619e7396461fae5813405bbffac8c718` plus substantial preserved working
   changes. The separate CMS checkout is `main` at
   `767032bc23b10ef48cb283fda4ee97241db62faf` plus preserved changes.

The common commit does not make either local checkout or remote history the
production source of truth. Live bind-mounted files and mutable images can differ
from that commit.

## Captured Dashboard comparisons

None of the four captured live Dashboard files is byte-identical to the current
local file.

- `dashboard/src/lib/services.ts`: live → local is 117 insertions / 14 deletions.
  The local version adds explicit health-evidence types and additional catalog
  entries. Classification: **local governance/health remediation plus catalog
  changes; not deployed; service claims require targeted verification**.
- `dashboard/tsconfig.json`: live → local is 3 insertions / 2 deletions.
  Classification: **local framework/tooling change; not deployed**.
- `dashboard/website/src/data/demos.json`: captured live host source has zero apps;
  the current local source has ten apps and no credential-like fields. The public
  deployed page separately contained a reusable credential at capture time.
  Classification: **CONTRADICTED publication state**. Host source, built static
  artifact, CMS database, and local curated source are different states; none may
  silently replace another.
- `dashboard/website/src/data/services.json`: the only semantic comparison found
  is property ordering; classification: **equivalent content candidate**, pending
  schema-aware confirmation.

Captured and local SHA-256 values remain in the source manifest and comparison
evidence; no credential value is recorded here.

## Captured CMS comparisons

The live CMS is a sibling in VM230's shared `/opt/docker` worktree. The workstation
CMS is a separate repository whose implementation lives under `website/`. All six
captured live CMS files differ from, or are absent from, the workstation checkout.

- Live service create/update/delete routes contain `priceNote`, `cta`, and
  `features` fields and call `syncServicesToJson()` while suppressing publication
  failure. The local routes omit those fields and calls. Classification:
  **authoritative live behavior requiring preservation plus known reliability
  defect; local checkout is not a safe replacement**.
- Live `lib/services.ts` has no counterpart in the local checkout.
  Classification: **authoritative live-only implementation; provenance missing**.
- Live `lib/projects.ts` publishes every `published` and available project; local
  code applies a marketing allowlist and accepts any non-archived available
  project before filtering. Classification: **CONTRADICTED business rule**. An
  operator-approved visibility rule is required before implementation.
- Live Prisma schema contains service fields absent from the local schema. The
  local schema also has unrelated working changes. Classification:
  **schema divergence; migration compatibility and production-shaped rehearsal
  required**.
- Compose differs by one line and remains **NEEDS REVIEW**; values and secret
  references must be compared without recording secret material.

## Proven facts

- The complete local Dashboard/website verification passes under Node `24.19.0`,
  and fresh audits of both lockfiles report zero known vulnerabilities. This is
  local evidence only.
- The Astro build exercised its honest unavailable-CMS path because no compatible
  CMS was listening at `127.0.0.1:8085`; real integration remains unverified.
- Current live and local implementations are not byte-identical.
- The production website's served artifact did not match the captured host-side
  `demos.json` source at the same evidence baseline.
- The CMS can report mutation success after its static publication call fails.
- The local Dashboard removes public credential fields, but this has not been
  deployed and does not revoke the exposed credential.
- The separate CMS repository cannot be deployed over VM230 as-is without losing
  live-only behavior and risking schema incompatibility.

## Targeted evidence still required

Do not repeat the fleet audit. Capture only:

1. VM230's sanitized `git status` path list and hashes for files changed after the
   August 18 capture.
2. Source-to-image/build provenance for each VM230 container, including the build
   context and immutable image identity where available.
3. The static website artifact manifest and its source/build timestamp, without
   copying the credential value.
4. CMS publication inputs/outputs and last-known-good behavior using sanitized
   test data; do not read the production database or private content.
5. Package/lock, Dockerfile/Compose, health implementation, public demo rendering,
   and CMS migration files not included in the selected source capture.
6. An operator decision on CMS project visibility: approved allowlist versus every
   published/available project.

## Candidate disposition for review

- Preserve the live-only CMS fields, routes, and publication adapter as required
  functionality; do not copy the silent-failure behavior.
- Preserve the local health-contract, TLS, container, immutable-release, and
  credential-removal remediation as candidate forward changes, subject to full
  verification against captured live behavior.
- Replace CMS publication with validated atomic generation, last-known-good
  retention, and a failed mutation response when publication fails.
- Treat the ten-item local demo catalog as proposed content, not production truth,
  until reconciled with CMS ownership and operator-approved visibility rules.
- Do not merge, pull, reset, push, build for production, or deploy until missing
  provenance is captured and this disposition is explicitly accepted.

## Exit criteria

VM230 reconciliation remains open until every relevant difference has an accepted
disposition, the production artifact can be reproduced from reviewed source, the
CMS schema/publication path is migration-tested, and rollback preserves the last
known-good non-secret website artifact and prior immutable images.
