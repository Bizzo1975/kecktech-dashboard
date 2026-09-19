# ADR-006: Private local desktop finance screen

- **Status:** Accepted for local implementation only
- **Date:** 2026-09-14
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED

## Context

The operator is collecting biller and checking-account providers, but wants app development to continue. The finance core can already import the monthly plan, review transactions, calculate preliminary balance differences, and record source freshness. A hosted dashboard would cross production, authentication, and private-data boundaries before provider contracts and live-to-Git reconciliation are ready.

## Decision

Build a local Python/Tk desktop screen over the existing private SQLite core. It has no HTTP listener. It displays monthly planned versus reviewed amounts, plan lines, transaction review, monthly spending limits, savings/funding goal targets, source freshness, and a preliminary statement balance check. Missing transactions and unverified goal progress display as unavailable, never as zero actual spending or achieved savings. A registered source remains labeled never synced until an adapter records a successful sync. The operator can import the budget workbook once as setup; routine manual statement imports are not a product workflow. The UI does not create bank connections, ingest email, pay bills, or post to ERPNext.

## Consequences

This gives a usable local presentation and review surface without exposing personal data through the production dashboard. It is not the finished first release: real-provider adapters, consent and token vault, encrypted source documents, account statement tie-out, user access controls for any shared deployment, and cross-app contracts remain acceptance gates. A local database stays outside Git. The system Python must include Tk and `openpyxl`; the repository's local launcher can use the bundled `openpyxl` package on this host when the system Python lacks it. UI startup was smoke-tested with an in-memory database on Windows; no private database or provider connection was created by that test.
