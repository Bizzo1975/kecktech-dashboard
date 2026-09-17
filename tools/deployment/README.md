# Deployment gate

Dashboard deployment is intentionally blocked while the authoritative live VM230 source is reconciled with Git.

The retired workflows executed `C:\actions-runner\deploy.ps1` from a broad self-hosted runner against mutable branches. That mechanism did not provide reviewed in-repository behavior, immutable artifact identity, provenance, development acceptance, rollback evidence, or production post-deployment validation.

Do not bypass `assert-deployment-authorized.ps1`. A replacement must:

1. build once from a reviewed commit and locked dependencies;
2. scan and sign an immutable artifact and generate an SBOM and provenance;
3. deploy that exact artifact to development;
4. pass documented application, integration, security, accessibility, and rollback checks;
5. promote the same digest through a protected production environment;
6. record pre-deployment recovery evidence and post-deployment results; and
7. automatically stop or restore the prior known-good digest when acceptance fails.

Re-enabling deployment requires a reviewed change to both workflow files, current live-to-Git reconciliation evidence, and the production approvals defined in `PROJECT_INSTRUCTIONS.md`.

`release-evidence.schema.json` defines the evidence exchanged between build and promotion stages. `assert-release-evidence.ps1` verifies structural requirements and exact artifact-set identity for candidate, development, and production stages. Its output is not cryptographic proof: the future isolated pipeline must verify signatures, SBOMs, and SLSA provenance with the producing tools before setting the recorded verification fields.

## Required release inputs

- `DASHBOARD_IMAGE`, `MAILER_IMAGE`, `PORTAL_IMAGE`, and `ADMIN_IMAGE` must each be complete OCI references ending in `@sha256:<64 hex characters>`.
- `DASHBOARD_INTERNAL_CA_FILE` must resolve to the reviewed PEM CA bundle that validates the certificates presented by mandatory internal HTTPS dependencies. It is mounted read-only and is not committed to the repository.
- The resolved image list must pass `assert-immutable-image-references.ps1` before either environment can create or update a container.
- The internal TLS acceptance test must prove a valid chain and expected hostname for each HTTPS dependency. Missing or invalid trust must stop deployment; disabling certificate verification is never a fallback.
