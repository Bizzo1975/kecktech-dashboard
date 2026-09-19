# Deployment provenance gap matrix

Status: **TARGETED CAPTURE QUEUE — no production mutation authorized**  
Evidence baseline: 2026-08-18  
Policy: `2026.08.18.1`

This matrix derives only from the 13 completed deployment metadata records and
the existing sanitized source manifest. It does not repeat fleet discovery and
does not claim that a running process, container, or HTTP response proves correct
application behavior.

## Summary

- 13 production deployment records contain 37 artifact/process observations.
- Three deployment records have a captured Git HEAD: Dashboard, Kecktech CMS, and
  Asset Forge.
- Ten records lack a source Git revision for the running deployment.
- Three records have any selected source capture: Dashboard (4 files), Kecktech
  CMS (6 files), and Asset Forge (1 file).
- Ten records have metadata only and no selected source capture.
- Seven recorded artifacts use a mutable `latest` tag even though their exact
  image IDs were preserved.
- The local `forge` repository has no verified production deployment mapping and
  must not be associated with Asset Forge by name.

Metadata capture is complete for its intended scope. Source-to-process/image
provenance is not complete.

## Dependency-ordered targeted queue

| Order | Deployment | Existing evidence | Missing provenance | Required next capture |
|---:|---|---|---|---|
| 1 | Dashboard / VM230 | Git HEAD, 6 image IDs, mounts, 4 source files | Dirty-path list, build inputs, static artifact source, several changed files | Sanitized changed-path/hash list, build context and artifact manifest |
| 2 | Kecktech CMS / VM230 | Shared Git HEAD, image ID, mounts, 6 source files | Separate-repository ancestry, live-only files, database-compatible migration chain | Sanitized live-only source/config hashes and schema/migration provenance |
| 3 | Asset Forge / VM115 | Dirty Git checkout and one matching source file | Full process/service revision and remaining source/config parity | Bounded source/config manifest excluding data, models, output, and secrets |
| 4 | GPU Broker / VM115 | Process/runtime metadata | No Git checkout or source-to-process revision | Entrypoint, service definition, executable/source hashes, package lock |
| 5 | Voice Clone / VM115 | Process/health metadata and deployment contradiction | No Git revision; live Linux source/service mapping unknown | Entrypoint, service/cron definition, sanitized source hashes, dependency lock |
| 6 | Me Manager / VM303 | 7 image IDs and mounts | `/opt/me-manager` source-to-image provenance | Compose/build context, repository revision or source manifest, immutable mapping |
| 7 | Cleaner / VM241 | Exact image/mount metadata | No Git checkout; image source and share scope unknown | Build/source identity plus read-only export/mount scope metadata |
| 8 | Sovereign / VM122 | 6 process/container observations | `/opt/sovereign` is non-Git; evaluator source/unit provenance unknown | Bounded source manifest, unit definitions, executable hashes, no generated evidence |
| 9 | Wiki / VM232 | 2 image IDs | Non-Git deployment; mutable app tag | Compose/build context, source revision/manifest, exact image mapping |
| 10 | Personal site / VM302 | 6 image IDs | Non-Git deployment; source-to-image unknown | Site/CMS source manifest, Compose/build provenance, public artifact identity |
| 11 | Jacob Roman / VM304 | 3 image IDs and corrected host | Non-Git deployment; source and anonymity provenance unknown | Sanitized source/artifact mapping with identity-safe metadata review |
| 12 | Uncle Jon / VM401 | 3 image IDs | Non-Git deployment; source-to-image unknown | Source/build/Compose manifest and public-route artifact identity |
| 13 | Mom Hub / VM242 | 2 image IDs | Non-Git deployment; source-to-image unknown | Source/build manifest, scanner/integration configuration references, no family data |

## Capture rules

For each row:

1. Load its existing deployment record and repository snapshot first.
2. Capture only the listed missing evidence and changes since the baseline.
3. Record paths, hashes, revision/artifact identity, build/deployment mechanism,
   configuration references, exclusions, and observation time.
4. Never capture secret values, databases, customer/family records, biometric
   material, models, generated media, private drafts, or runtime payloads.
5. Compare live, local, and existing remote-tracking history without pull, reset,
   checkout-over, push, build-for-production, or deployment.
6. Leave disposition `unresolved` until the operator accepts which behavior and
   source must be preserved.

## Exit

A row exits this queue only when the running process/image maps to reviewed source
and locked build inputs, every live/local/remote difference is classified, secret
and private exclusions are recorded, and the canonical disposition is accepted.
