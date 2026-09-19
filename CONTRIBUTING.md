# Contributing

All changes must follow [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md) and [AGENTS.md](AGENTS.md).

1. Start from verified code and operational evidence; record contradictions instead of guessing.
2. Define observable acceptance criteria and rollback before production-affecting work.
3. Keep one coherent change per pull request and preserve unrelated work.
4. Add or update tests, schemas, docs, runbooks, and monitoring with the implementation.
5. Run every repository-local format, lint, type, test, build, security, and
   policy check documented in `AGENTS.md`. A missing check is a recorded gap,
   never an implied pass.
6. Obtain review and production environment approval. Promote the tested immutable artifact; never deploy an unreviewed local worktree.

Security findings must follow [SECURITY.md](SECURITY.md). Exceptions use `.policy/exceptions/*.json`, require approval, and expire.

<!-- BEGIN KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->

Follow PROJECT_INSTRUCTIONS.md, AGENTS.md, and the applicable .cursor/rules/
files. Preserve unrelated work; define observable acceptance and rollback; add
regression coverage; run every repository-local format, lint, type, test, build,
security, and policy check. A missing check is a recorded gap, never an implied
pass. Production requires reviewed immutable delivery and post-change evidence.

<!-- END KECKTECH CONTRIBUTING POLICY 2026.08.18.1 -->






