# ADR-004: Isolated local finance core

- **Status:** Accepted for local implementation only
- **Date:** 2026-09-13
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED

## Context

The private Finance and Resource Hub needs personal account and budget records. The current dashboard also exposes Kecktech business billing routes and has a dirty, unreconciled production-connected worktree. Marketlist owns household food records and ERPNext owns business books. The current OneDrive budget file is not readable while open; only an earlier copy was inspected.

## Decision

Start with an isolated, offline `finance-core/` package in this repository. It has no HTTP listener, bank credentials, or production connection. The operator supplies a database path outside source control. The first commands import a versioned budget and account transactions, review source counts, and calculate statement differences. Every imported item retains a source-file digest and row location; repeat imports are idempotent. Imported bank rows remain unclassified until reviewed. Planned budget amounts are never represented as paid transactions.

Future web, Marketlist, ERPNext, bank-feed, and AI adapters require their own versioned contracts, server-side authorization, privacy review, and acceptance. This local core does not authorize deploying a finance service or placing personal records in the dashboard or Notion.

## Consequences

The first slice can be tested with synthetic data and the historical workbook structure without committing private amounts. A real current-workbook import and monthly reconciliation remain acceptance gates. No user-facing dashboard or automated financial advice is claimed by this ADR.
