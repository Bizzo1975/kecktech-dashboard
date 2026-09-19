# ADR-010: Cross-domain read models for private finance

- **Status:** Accepted for local implementation only
- **Date:** 2026-09-15
- **Evidence:** LOCALLY VERIFIED — NOT DEPLOYED

## Context

The hub must join household finance with MarketList inventory, ERPNext business books, and resource telemetry. Those systems remain authoritative for their own facts. Copying editable ledgers into the hub would create conflicting sources of truth, while waiting for live provider credentials would block validation of domain boundaries and user experience.

## Decision

Add revision-aware, read-only local models with source evidence hashes:

- Account statements store source opening and closing balances and calculate a preliminary tie-out against posted feed entries. A zero difference is arithmetic evidence, not proof that a feed is complete.
- MarketList pantry snapshots replace the prior snapshot atomically and remain household-bound. Quantity is inventory, not grocery spending or farm income. Missing data and a verified empty pantry remain distinct.
- ERPNext business records accept submitted or canceled documents for Kecktech, commercial homestead, and datacenter scopes. Submitted expenses and assets missing business purpose or tax category appear as year-end exceptions. The hub does not post journals or decide tax treatment.
- Resource measurements retain metric, quantity, unit, UTC interval, site, owner, and measured or estimated quality. The hub does not translate physical quantities into money without a verified tariff and allocation method.
- Savings signals report observed bill increases and reviewed spending-limit overruns. They do not state projected or realized savings.

All adapters remain separate from the desktop application. A registered source never implies connectivity. Current snapshots retain their source revision and evidence hash; raw provider payloads and credentials are outside these models.

## Consequences

The professional local screen can present honest empty states and cross-domain views before providers are selected. Provider contracts still must prove authentication, authorization, pagination, deletion, completeness, retry, and freshness behavior. ERPNext and MarketList integration requires live-to-Git reconciliation and separate production approval. Resource cost calculations require tariff versioning and shared-use allocations. The current local SQLite file is not application-level encrypted; it must remain on an access-controlled, encrypted Windows volume, and this must be verified before real financial data is loaded.
