# F:\Github fleet Git reconciliation plan — 2026-09-15

Status: **LOCALLY VERIFIED — PLANNING ONLY**  
Audit scope: bounded discovery below `F:\Github`, excluding Git internals, dependency/vendor trees, virtual environments, build output, caches, model stores, runtime data, and private recovery captures.  
Remote authority checked: authenticated `Bizzo1975` GitHub catalog and refreshed `origin` references.  
Production authority: verified live deployments remain authoritative until each production-connected repository has an accepted disposition.

## Outcome sought

Establish one intentional local working copy and one reviewed GitHub history for every source repository, while preserving all uncommitted work, preventing secret/private data publication, retaining live production behavior, and creating reproducible revisions that can later be deployed through reviewed immutable artifacts.

This plan does not authorize commits, pushes, merges, branch deletion, repository deletion/archive, history rewriting, production deployment, or cleanup of duplicate directories.

Operator rule confirmed 2026-09-15: **no environment-value file is ever pushed**. Files such as `.env`, `.env.local`, `.env.production`, environment backups, login responses, or credential exports remain local/private even when already tracked. Placeholder-only `.env.example` or `.env.template` files may be proposed only after value-free verification.

## Audit summary

- 60 local Git directories were discovered.
- 68 repositories exist in the authenticated `Bizzo1975` GitHub account; none are marked archived.
- 51 unique GitHub repositories have at least one local clone.
- 17 GitHub repositories have no local clone in the audited boundary.
- 2 GitHub repositories have duplicate local clones: `personal-website-gen` and `squirrel-mobile-game`.
- 7 local Git directories have no `origin`.
- 8 local Git directories have no upstream branch.
- 54 local trees are dirty, 4 are clean, and 2 have no valid commit.
- Three post-fetch branch divergences require history reconciliation:
  - `kecktech-dashboard/dev`: 7 behind / 3 ahead.
  - `kecktech-wiki/dev`: 0 behind / 2 ahead; GitHub's default branch is `main`.
  - `Running Apps/personal-website-gen/main`: 1 behind / 3 ahead after GitHub force-updated the remote branch.
- The `personal-website-gen` fetch reported forced updates to remote branch histories. No local branch was changed by the fetch.
- Tracked secret-like filename blockers exist in `app-manager`, `family-dinner-recommendation`, `Future Ideas/syll`, and `Future Ideas/workflow-planning`. Contents were not exposed during this audit.

## Repository classes

### Class A — production-connected and governance-critical

Reconcile these first and validate against the existing live deployment records before accepting local changes:

- `asset-forge`
- `cleaner`
- `forge`
- `Future Ideas/netops-tool`
- `gpu-broker`
- `Huxley`
- `kecktech-dashboard`
- `kecktech-infrastructure`
- `kecktech-wiki`
- `kecktech/Kecktech`
- `me-manager`
- `mom-hub`
- `nexus`
- `personal-website-gen`
- `Running Apps/personal-website-gen`
- `Running Apps/psuedonym-site`
- `sovereign-standalone`
- `unclejons-itgarage-site`
- `voice-clone-service`

`flooros` is production-connected in GitHub/Notion but is remote-only locally and must be restored as a clean canonical clone before reconciliation.

### Class B — active or substantial application development

- `ai-date-night`
- `app-manager`
- `Dashboard`
- `debateforge`
- `Desktop Apps/dev-launcher`
- `family-dinner-recommendation`
- `Future Ideas/life-box`
- `Future Ideas/question-gen-tool`
- `Future Ideas/ratemyrack`
- `Future Ideas/rental-property-manager-2.0`
- `Future Ideas/speakeasy-coach`
- `Future Ideas/squirrel-mobile-game`
- `Future Ideas/syll`
- `Future Ideas/vinyl-graphics-ecommerce`
- `Future Ideas/what-do-i-know-2`
- `Future Ideas/workflow-planning`
- `grocery-app`
- `group-chat-international`
- `interview-prep`
- `nexus-forge`
- `squirrel-mobile-game`

### Class C — smaller or dormant local GitHub-backed ideas

- `Future Ideas/ai-education`
- `Future Ideas/come_together`
- `Future Ideas/control-center`
- `Future Ideas/diabetes-tracker`
- `Future Ideas/eccommerce-app-dropship-murphy`
- `Future Ideas/habit-builder`
- `Future Ideas/new-game-idea`
- `Future Ideas/posti-bot`
- `Future Ideas/profit-analysis`
- `Future Ideas/prpg-game-app`
- `Future Ideas/real-estate-app`
- `Future Ideas/sports-bet`
- `Future Ideas/storage`
- `Future Ideas/t-shirt-2.0`
- `Future Ideas/twitch`
- `Future Ideas/ultimate-arbitrage-app`
- `Future Ideas/unique-story-game`

### Class D — local-only or structurally ambiguous

- `cleaner` — committed history, dirty, no origin/upstream; production-connected.
- `Desktop Apps/desktop-rental-property` — clean committed history, no origin/upstream.
- `forge` — committed history, dirty, no origin/upstream; production-connected reference.
- `mom-hub` — committed history, dirty, no origin/upstream; production-connected.
- `nexus-forge` — committed history, dirty, no origin/upstream.
- `Future Ideas/tools/web_ui/projects/AI-Date-Night` — unborn embedded repository with 49 untracked entries; overlaps the canonical top-level `ai-date-night` project.
- `twisted tavern/Packages/_Index/evaera_promise@4.0.0/promise/modules/testez` — package-vendor Git metadata, no valid local commit; exclude from first-party repository management.

### Class E — GitHub repositories absent locally

Production-relevant:

- `flooros`

Other remote-only repositories:

- `ai-voice-over`
- `brand-builder-aiv2`
- `game-screen-reader`
- `image-gen-tool`
- `images` (empty/default branch absent in GitHub metadata)
- `mobile-game`
- `project-dashboard`
- `prompts`
- `rental-propert-manager`
- `roku-midas-touch`
- `social-media-uploader`
- `Templates`
- `tile-picker`
- `trump-rant`
- `what-do-i-know`
- `wilson-art`

Clone these into a quarantine/import area first. Do not infer that a similarly named local folder is equivalent without comparing Git object identity and content.

## High-risk findings requiring individual treatment

### Duplicate `personal-website-gen` clones

- `F:\Github\personal-website-gen` is clean on `production` and matches rewritten `origin/production`.
- `F:\Github\Running Apps\personal-website-gen` is dirty on `main`, 1 behind / 3 ahead of rewritten `origin/main`.
- The two directories represent different branches and working states of the same remote. Preserve both until the dirty main work, production history, and live deployment are reconciled.
- Do not merge `main` into `production`, delete either directory, or force-push. First create a preservation reference for every local-only commit and produce patch/file manifests for uncommitted work.

### Duplicate `squirrel-mobile-game` clones

- Both clones currently point to `Bizzo1975/squirrel-mobile-game` at the same recorded commit and expose matching large dirty-state counts.
- Treat them as potentially divergent working copies until file-level hashes prove equivalence.
- Select a canonical path only after preserving unique files and confirming Unity-generated/private artifacts are excluded.

### Dashboard history divergence

- `kecktech-dashboard/dev` is 7 behind / 3 ahead.
- The local and remote histories contain related health-check work plus remote preservation/merge commits; commit-message similarity does not prove patch equivalence.
- Build a temporary reconciliation branch from current `origin/dev`, replay or merge the three local commits in a separate worktree, then apply the preserved working tree by coherent topic. Resolve conflicts only after comparing VM230 live evidence.

### Sovereign working tree size

- `sovereign-standalone` has 582 tracked changes and 461 untracked entries at the top-level status boundary.
- It spans assistant work, application changes, generated evidence, scripts, UI work, and operational experiments. It must not be committed or deployed as one unit.
- First separate generated/runtime evidence, temporary scripts, policy rollout, assistant contract, backend domains, UI slices, and operational tooling into independently reviewable manifests.

### Tracked environment filenames

Block publication until a value-free secret audit and history scan complete for:

- `app-manager/.env`
- `family-dinner-recommendation/.env`
- `Future Ideas/syll/.env` and application `.env` files
- `Future Ideas/workflow-planning/.env` and `.env.local`

If any live credential is present, do not print it or merely delete the current file. Identify exposure scope, remove it from the proposed commit/history, and request credential-specific rotation approval.

## Execution plan

### Phase 0 — freeze and evidence preservation

1. Keep all existing working directories in place. Do not run reset, clean, checkout-overwrite, rebase, pull, or bulk formatting.
2. Record for every repository: absolute path, filesystem identity, HEAD, all local branches/tags, upstreams, remote URLs, worktrees, submodules, LFS configuration, status porcelain, staged/unstaged diff statistics, untracked manifest, ignored large-file classes, and Git object integrity.
3. Create a private, non-repository evidence root for manifests and patch bundles. Exclude credentials, `.env` values, databases, manuscripts, models, generated media, client/family data, and runtime state.
4. For production-connected repositories, bind the snapshot to the existing live deployment record and classify current evidence freshness.
5. Before any commit or push, scan tracked history, staged content, and candidate untracked source for credentials, private keys, tokens, connection strings, customer data, manuscripts, model weights, databases, and oversized binaries.
6. Untrack environment-value files from proposed Git trees without deleting the operator's local copy. If such a file already exists in remote history, quarantine the repository for credential validation and history-remediation review; do not force-push or rotate credentials without the separately required approval.

Exit: every byte that may be transformed has a recoverable private preservation path and immutable manifest; no secret value is included in a shared report.

### Phase 1 — repository identity decisions

1. Decide the canonical local path for the two duplicate remotes.
2. Decide whether each local-only first-party repository receives a new private GitHub repository, maps to an existing remote under a different name, is intentionally local-only, or is archived as a private bundle.
3. Mark the embedded AI-Date-Night repo as either unique salvage material or an accidental nested repository. Do not delete its `.git` directory until unique history/content is preserved.
4. Exclude the vendored `testez` Git metadata from first-party governance.
5. Clone all 17 remote-only repositories into a quarantine/import directory using their GitHub default branches, then verify object connectivity and working-tree cleanliness.
6. Compare similarly named pairs (`Dashboard` vs `kecktech-dashboard`, `project-dashboard`; rental-property variants; `mobile-game` vs squirrel projects; `what-do-i-know` variants) by Git history and content before any consolidation decision.

Exit: every local and GitHub repository has an accepted identity: canonical, duplicate-to-reconcile, local-only, remote-only-to-clone, vendor, empty, or retirement candidate.

### Phase 2 — preserve local work on safety branches

For each dirty repository, one at a time:

1. Create a namespaced preservation branch from the current HEAD without switching away from or overwriting files.
2. Partition changes into: source, tests, migrations, deployment/config, governance, documentation, generated output, runtime/private data, and obsolete/temporary material.
3. Update ignore rules only after verifying ignored items are reproducible or private and are preserved elsewhere when needed.
4. Commit coherent source changes separately from governance rollout and documentation. Never include models, databases, manuscripts, generated media, credentials, local caches, build output, or private evidence.
5. Run repository-native tests and security/secret scans for each coherent commit.
6. Tag or bundle the pre-reconciliation state privately before integrating remote history.

Suggested order within this phase:

1. Clean/simple repositories and policy repository.
2. Unified Assistant set: Nexus, GPU Broker, Huxley, Sovereign, Dashboard recovery records, Infrastructure registry.
3. Remaining production-connected repositories.
4. Active development repositories.
5. Dormant ideas.

Exit: every valuable local change exists in reviewable commits on a preservation branch; dirty runtime/generated/private material remains outside proposed Git history.

### Phase 3 — reconcile GitHub history

1. Start a fresh integration branch from the current remote default/tracking branch.
2. Apply reviewed preservation commits by cherry-pick or a no-fast-forward merge chosen per repository; never blindly pull into a dirty tree.
3. For force-updated branches, use merge-base, patch-id, range-diff, and file-level comparison to identify rewritten-equivalent commits before integrating.
4. Resolve conflicts against accepted product/live behavior, not merely the newest timestamp.
5. Normalize upstreams only after branch purpose is accepted. Do not silently convert `master`, `dev`, `main`, and `production` roles.
6. Push preservation branches first, then reviewed integration branches. Open pull requests where GitHub supports the workflow; never force-push shared branches.

Exit: GitHub contains all accepted local work without losing remote work or rewriting shared history.

### Phase 4 — production-connected acceptance

1. Compare each accepted integration revision with live deployed source/configuration using sanitized hashes and immutable artifact identities.
2. Classify each live difference: accepted-live, accepted-local, merge-required, runtime-only/private, obsolete, or unresolved.
3. Incorporate accepted live behavior into reviewed source; do not copy secrets or runtime data.
4. Produce locked clean builds, tests, SBOM/provenance, rollback identity, and development acceptance evidence.
5. Deploy only after exact approval and in dependency order. The Unified Assistant order remains Sovereign/LiT read-only contracts, GPU Broker, Nexus API with execution disabled, then Nexus UI.

Exit: every production deployment maps to a clean reviewed Git revision and immutable artifact, with rollback and post-deployment proof.

### Phase 5 — governance and long-term synchronization

1. Update `kecktech-infrastructure` repository registry to cover every accepted production-connected repository and explicitly exclude personal/dormant/vendor repositories.
2. Apply policy checks only where applicable; do not inject production deployment workflows into dormant idea repositories.
3. Configure protected default branches or the accepted Forgejo/GitHub mirror model after separate infrastructure approval.
4. Enforce secret scanning, dependency locking, tests, artifact provenance, and backup/restore requirements appropriate to each repository class.
5. Maintain a periodic read-only drift report for local HEAD, GitHub HEAD, dirty state, and deployed artifact identity.

Exit: drift is visible, new changes follow reviewed branches, and no production host or workstation directory is an undocumented source of truth.

## Per-repository completion checklist

- Identity and canonical path accepted.
- Origin ownership and repository visibility verified.
- Default/tracking branch purpose accepted.
- Local commits, uncommitted work, tags, and alternate worktrees preserved.
- Secret/private-data and large-binary scans passed.
- Generated/runtime files classified and excluded appropriately.
- Remote changes integrated without history loss.
- Repository-native tests and policy checks passed from a clean checkout.
- Production provenance reconciled where applicable.
- GitHub branch and pull request reviewed.
- Rollback/preservation bundle verified before duplicate cleanup.
- Duplicate or obsolete directory cleanup separately approved only after all prior checks pass.

## Immediate safe work queue

1. Generate private immutable manifests and Git bundles for the three diverged repositories.
2. Audit the four tracked `.env` cases without exposing values.
3. Reconcile and publish `kecktech-infrastructure` governance changes on a review branch.
4. Split and preserve the Unified Assistant changes across its six repositories.
5. Build the Dashboard 7-behind/3-ahead reconciliation branch in an isolated worktree.
6. Restore a clean local `flooros` clone and link it to the production record.
7. Resolve local-only repository identities.
8. Clone and classify the remaining 16 remote-only nonproduction repositories.
9. Reconcile duplicate `personal-website-gen` and `squirrel-mobile-game` working copies.
10. Process remaining dirty repositories from smallest/lowest-risk to largest, leaving Sovereign's unrelated workstreams separated.

## Explicit non-goals until separately approved

- No repository, branch, tag, file, VM, container, backup, database, model, manuscript, or generated asset deletion.
- No force-push or history rewrite.
- No remote repository creation, archive, visibility change, rename, or transfer.
- No production deployment or service restart.
- No DNS, network, firewall, VLAN, resolver, or Proxmox-network change.
- No credential rotation or publication of credential values.
