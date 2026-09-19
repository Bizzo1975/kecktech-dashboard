# ADR-008: Bill document lifecycle

Status: Accepted for local implementation, 2026-09-14.

The Finance and Resource Hub records a bill as a provider-sourced obligation, separate from account transactions and budget plans. A bill does not establish payment, a bank withdrawal does not by itself establish which bill it paid, and neither can silently change reviewed actual spending.

Registered `biller` and `mailbox` sources may submit a stable bill ID, revision, evidence SHA-256, UTC observation time, amount due, issue and due dates, description, and optional service period. An exact replay is idempotent. Conflicting evidence for a revision and older or simultaneous revisions are rejected. A later correction replaces the current bill snapshot while retaining revision evidence. A void event removes it from the current received-bills view without erasing its evidence. Amount due can be zero; negative credits need a separate, explicit model. Dates and amounts are validated before writing. Source event and current bill update commit atomically.

The local Bills screen shows current received bills and explicitly labels payment status unknown. Raw statements and credentials are not stored by this model. A future provider adapter must handle consent, retrieval, authorization, encrypted source-document retention, and provenance before calling the ingestion function. A later payment-matching design must require reviewed account evidence and handle partial payments, credits, and multiple bills per transaction. This decision introduces no live connection or production deployment.
