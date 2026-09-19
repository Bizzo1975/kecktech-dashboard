# ADR-007: Account feed transaction lifecycle

- **Status:** Accepted for local implementation only
- **Date:** 2026-09-14
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED

## Context

The private finance core can identify sources and revisions but could not turn live account updates into current posted transactions. A bank or card feed may first report a pending item, later post a changed amount/date, correct it again, or remove it. Summing every webhook payload would double-count spending; counting pending items as final would misstate actuals.

## Decision

Add a provider-neutral account-event ingestion contract restricted to registered bank, credit-card, and loan sources. The adapter supplies an opaque provider record ID, unique revision, evidence SHA-256, observed timestamp with offset, account-perspective signed amount, date, description, and pending/posted/removed state. One current transaction row is maintained per `(source_id, record_id)`; every revision's hash and timestamp is retained. Exact replay is idempotent, conflicting same-revision evidence and out-of-order updates are rejected, and a removal is a tombstone. A change in date, description, amount, or posting state resets any prior human classification. Pending and removed records stay visible for audit but are excluded from actual summaries, transfer candidates, and statement balance checks. Only posted records can be reviewed.

The event revision and current-row update occur in one database transaction. No raw event payload is stored here. A provider adapter may record a successful sync only after its full fetch and ingestion pass succeeds. Registration or an event alone does not assert a live connection.

## Consequences

Monthly actuals can eventually consume genuine bank/card feeds without duplicate revision totals. This is still a local core, not an institution integration: provider consent, API credentials, webhook verification, provider-specific sign/status mapping, encrypted raw evidence, batch checkpointing, and live-account acceptance remain required. Schema version 6 adds posting status and source-to-current-transaction mapping. Back up an existing local database before upgrading; rollback is restoring that backup with the prior code. No private database was migrated or live provider contacted by this change.
