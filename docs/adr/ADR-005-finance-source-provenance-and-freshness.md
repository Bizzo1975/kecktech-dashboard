# ADR-005: Local source provenance and freshness foundation

- **Status:** Accepted for local implementation only
- **Date:** 2026-09-14
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED

## Context

The Finance and Resource Hub must eventually acquire checking, card, bill, income, Marketlist, ERPNext, and meter data without routine manual imports. The provider workbook is being completed, so no provider-specific API, consent, or mailbox route can be asserted yet. The existing offline core has no durable source identity or feed freshness record.

## Decision

Add a private local source registry keyed by opaque source ID, owner scope, source kind, and expected update interval. Record each upstream event by provider record ID, revision, SHA-256 of its evidence, observed time, and received time. Replaying the same revision and hash is idempotent; the same revision with different evidence is a conflict requiring investigation. Record successful and failed sync attempts with safe error codes and derive never-synced, fresh, stale, or error state from those attempts. Registration alone is never a live connection. Do not store raw financial payloads in this registry; future adapters require an approved encrypted evidence store and provider-specific contracts before ingestion.

## Consequences

The core can track provenance and missed updates independently of the eventual bank or biller vendor. It currently has no network adapter and cannot truthfully show an account as connected. The source table contains no provider credentials. A future authenticated service must enforce owner scope at the boundary, verify provider webhook signatures, manage consent and tokens in a vault, and test real-source recovery before any production use. The schema moves from version 3 to 4; existing local database files should be backed up before upgrade, and the rollback is restoring that backup with the prior code. No private database was migrated in this change.
