# Kecktech Finance and Resource Hub

**Design baseline:** September 2026. **Status:** research-backed proposal; no implementation or production acceptance implied. **Initial audience:** one private household and its Kecktech and homestead operations, with an explicit path to multiple customers later.

## Executive decision

**Connection requirement updated 2026-09-14:** Routine manual file imports are outside the product's acceptance criteria. The [live connection plan](finance-live-connection-plan-2026-09.md) inventories every source family and the workbook's 74 proposed automation rows, and defines a provider-by-provider proof gate. The offline CSV importer remains a local development/recovery utility, not the intended normal user flow. Current provider identities are missing from the workbook, so no individual bank or biller coverage is certified.

Build a private **Finance and Resource Hub** as a separate bounded application and data store. Expose its summary in `dash.kecktech.net`; integrate with Marketlist for food and household inventory, ERPNext for business books, and read-only operational telemetry for energy and datacenter costs. The hub owns personal budgeting, account reconciliation, cross-domain allocation, savings experiments, and the unified decision view. It does **not** become the accounting ledger for Kecktech or the inventory ledger for Marketlist. This avoids duplicating existing facts while permitting a joined view of cash, food, energy, and equipment.

The system must distinguish four values everywhere: **observed**, **booked**, **forecast**, and **counterfactual**. A debit transaction is observed cash movement; an approved ERPNext invoice is booked business activity; next month's utility cost is a forecast; solar electricity's avoided grid expense is a counterfactual until measured against a defensible baseline. These may appear together but cannot be summed as though they were the same thing.

## Evidence baseline and constraints

**OPERATOR CONFIRMED:** The scope spans personal finance; household and commercial homestead activity; Marketlist; Kecktech Ops; a planned datacenter; solar, geothermal, and other resource systems. The first release is private, designed for later expansion. The detailed design belongs in this repository.

**DOCUMENTED — NEEDS REVERIFY:** The [Homestead Project Hub][N1], last edited 2026-09-14 UTC, separates the current property plan from future land-dependent thermal, co-op, and datacenter concepts. It records a household expense baseline and expense-elimination aspiration; these are **planning figures**, not reconciled transaction actuals, and their private values must stay out of source control. It records Kecktech MSP as pre-revenue at that capture. Its datacenter and thermal systems are explicitly future and contingent, so the application must accommodate them without treating them as installed or producing savings now.

**DOCUMENTED — NEEDS REVERIFY:** The [August 18 operations handoff][N2], [canonical execution plan][N3], and [Known Issues][N4] identify KT-DNS-001 as active, production-to-Git reconciliation as incomplete, and PBS backups as intentionally suspended. August 16 fleet and August 18 deployment captures are the operational baseline. This research involved no live inspection; present production state is **[ NEEDS CAPTURE ]**. No production deployment, network/VM change, credential action, or database write is part of this proposal.

**LOCALLY VERIFIED — NOT DEPLOYED:** Repository review found Marketlist in `F:/Github/grocery-app`: Expo mobile, Next.js PWA, Express API, PostgreSQL; household-scoped lists, pantry, recipes, garden yields, FarmBot integration, price history, receipt capture, and spending insights. Its README says basket estimates derive from real `PriceHistory`, which is a useful design invariant.[R1] Current routes include `/lists/:id/complete`, `/pantry`, `/prices`, `/insights/spending`, and `/garden-yields/:id/harvest`.[R2] The dashboard service registry lists ERPNext as CRM/billing/HaaS and n8n as workflow automation; these are catalog claims, not proof of integration health or contract readiness.[R3] The [VM Registry][N5] documents Marketlist web/API/DB co-hosted on VM230 at the August capture, not current health.

**Missing acceptance-critical inputs:** account/statement samples; financial institution list; ownership/legal form of the homestead activities; accountant-approved chart of accounts and tax methods; current ERPNext/API deployment and data model; utility providers and meter capabilities; sensor inventories; allocation rules for shared assets; current Marketlist API identity and auth integration. No individual tax credit, ROI, rate, bill-negotiation result, or bank coverage is assumed.

### Workbook reconciliation after initial design

**LOCALLY VERIFIED — historical workbook version only:** `C:/Users/jonkd/Downloads/household_expense_baseline_1.xlsx` (modified 2026-09-13 20:16 local) was read without editing. It has `Read Me`, `Household Budget` (63 rows, five columns), and `Summary` (16 rows, three columns). The budget consists of monthly amounts multiplied by 12, with categories for housing, utilities, food, transportation, non-mortgage debt payments, subscriptions, and discretionary costs. It contains no income schedule, account register, statement reconciliation, actual transaction feed, or structured vendor/contract identifiers. Its healthcare line is intentionally excluded from the grand total. The workbook's “projected expenses after elimination” subtracts a target from the budget; it is a scenario, not a verified saving. No private cell values are reproduced here.

**LOCALLY VERIFIED — NOT DEPLOYED, current workbook version:** `C:/Users/jonkd/OneDrive/Documents/household_expense_baseline_1.xlsx` became readable on 2026-09-14 and was inspected read-only. It is a distinct, much richer workbook with 20 sheets: `Cover`, `Dashboard`, `Yearly Summary`, `Budget Plan`, `Transactions`, `Credit Cards`, `Connections`, `Bill Automation`, and January–December tabs. The `Budget Plan` contains 924 populated 2026 rows: 77 lines in each month, comprising 74 expense and three income lines. Values are positive planned amounts. The `Transactions` input table has no populated transaction rows, so the current workbook does **not** establish actual income or spending despite its actuals formulas and dashboard. The yearly actuals formula, like the monthly formulas inspected, filters on `Status="Posted"`. Debt balances/APRs and provider automation ideas require separate verification; their presence in a cell is neither a reconciled account balance nor an active connection. No private figures or provider identifiers are reproduced in this document.

**Attachment follow-up (2026-09-14):** The operator attached the same `Downloads/household_expense_baseline_1.xlsx` file as the reference for continued work. A second read-only structural inspection confirmed 29 line items in seven categories; independent category aggregation matched the offline importer's monthly planning total exactly. One transportation item has no monthly amount and stays unknown. This validates the importer against the **attached file**. It does not establish that the newer OneDrive copy has the same content or that any budget line is a paid actual. Private amounts remain in the workbook and local inspection only, outside this repository document.

**Design correction from the inspected version:** Treat `Monthly $` as a planning input with a period and payment frequency, not an observed bill or monthly actual. Annual-only payments divided by twelve need their actual due date and full cash amount preserved separately. Separate credit-card **payments** from card **purchases** and debt principal from interest to avoid double-counting expenses. Blank input cells are unknown/not budgeted until explicitly classified; the workbook's blank-as-zero instruction is unsuitable for an honest automated budget. Import the deferred healthcare line as an excluded scenario item with a review date, not as zero cost. Preserve workbook categories as a mapping layer rather than forcing them to become the permanent account or tax categories.

**Current import contract:** Prefer `Budget Plan` when present. Import each nonempty row by year, month, type, category, line item, and positive planned amount, preserving source row and workbook digest; keep the old three-sheet importer for historical comparison. Treat the current `Transactions`, `Credit Cards`, and `Bill Automation` sheets as separate potential ingestion domains, not as budget actuals or active integrations. Review transaction status, source, sign convention, debt ownership, and automation authorization before ingesting them. Workbook formulas and dashboard summaries are presentation/derived data, never independent source events. The current workbook has no actual transaction rows, so reconciliation and realized-savings claims remain unavailable.

### Current workbook source-to-field map (read-only inspection, 2026-09-14)

- `Budget Plan` A:G, header row 4: `Year`, `Month`, `Type`, `Category`, `Line Item`, `Planned Amount`, `Notes` map to a versioned monthly plan line and source row. All 924 populated rows are 2026 entries; 588 planned amounts are explicit zero. Zero is preserved as the workbook's stated plan, but cannot establish that an obligation or income source does not exist. A bill/source review should distinguish confirmed zero, inactive, unknown, and intentionally omitted.
- `Transactions` A:I, header row 4: `Date`, `Type`, `Category`, `Line Item`, `Description`, `Amount`, `Source`, `Status`, `Notes` could map to normalized actuals only after source and status rules are approved. Its instructions use positive amounts with `Type` determining direction and `Posted` determining inclusion. There are zero populated transaction rows now. A bank CSV uses the opposite, account-perspective sign convention; adapters must normalize this explicitly.
- `Credit Cards`: the sheet requests a balance-as-of date, current balance, limit, APR, minimum, and planned payment, with calculated payoff/utilization views. These are user-entered snapshots and scenarios, not a statement import. Require per-card ownership, statement date, minimum due date, APR applicability, and matching liabilities before using them for debt advice; keep card purchases separate from payments.
- `Bill Automation` A:K, header row 5: 74 entries map possible category/item/frequency/provider/method and setup status. The inspected status values are `Provider needed` (52), `Rules not configured` (13), and `Review needed` (9). These are proposed workflows; none demonstrates a live bill feed or a paid bill. `Connections` is setup guidance. Do not import either sheet as actual cash activity.
- `Dashboard`, `Yearly Summary`, and `Jan`–`Dec` are derived reporting surfaces. Their actuals formulas inspected filter `TxnTable[Status]="Posted"`; with an empty transaction table, they cannot validate any plan amount. No external workbook links were found in the read-only inspection.

**Next acceptance gate:** obtain one redacted or locally held checking/debit statement and one credit-card statement for the same closed period, plus the matching opening and closing balances. Confirm sign conventions, pending/posted handling, account ownership, and whether credit-card payments appear in both accounts. Import locally, review and match transfers, and reconcile before enabling any actual-versus-plan dashboard or AI savings claim. This is a data and authorization gate, not a request to connect bank credentials.

## Product boundaries and primary jobs

### Personal finance

Import existing workbook as a versioned plan. Record income sources, pay schedules, bills, due dates, debt minimums, discretionary envelopes, savings goals, sinking funds, and account balances. Import transactions and statements, reconcile every account monthly, classify transfers separately from income/expense, detect recurring streams, and surface missing or changed bills. A debit-card purchase remains an account transaction and may also carry line-item receipt detail. Reconciliation compares the opening balance plus posted transactions to the statement closing balance; pending transactions appear separately. Spending limits warn at configurable thresholds but never silently block payments. Goals report contributions, withdrawals, target date, and forecast based on verified cash flow.

### Household food and homestead

Marketlist remains the household food workflow: shopping trip, actual receipt items, pantry stock, recipe consumption, and garden harvest. Add provenance and disposition to homestead stock movements: harvested, purchased, sold, consumed by household, fed to animals, preserved, donated, spoiled, or transferred to a business warehouse. Track quantity, unit, lot, harvest/source date, quality descriptors, storage location, expiry, and measurement confidence. A household transfer from farm output is neither a new sale nor external income. Cost-to-grow comparisons must include seeds/feed, water, energy, packaging, losses, and explicitly chosen labor treatment; otherwise label the result partial.

### Kecktech and commercial homestead

ERPNext should own customer/supplier masters, invoices, payable/receivable state, stock accounting where used, payments, chart of accounts, and posted business journals. The hub consumes approved summaries and source IDs, and can create **draft** proposals through a controlled integration once accounting policy is accepted. Every business expense needs evidence of vendor, date, amount, payment, description, entity, and business purpose; shared-use items need a documented percentage/basis and reviewer. IRS guidance identifies these supporting documents and asset records as central to tax-ready books.[W1] Personal/family expenses are generally distinct from business expenses; mixed-use costs require allocation.[W2] Farm activities have specialized income, expense, and inventory treatment, so the hub should retain quantities and supporting evidence while the accountant determines the applicable accounting method and return treatment.[W3]

### Energy, facilities, and datacenter

Ingest utility bills and interval use (where available), meter readings, solar generation/export, battery charge/discharge, HVAC/ground-source heat-pump energy, thermal storage inputs/outputs, water consumption, server power, rack occupancy, hardware depreciation schedules, cooling, connectivity, and maintenance. Attach every physical measurement to a site, meter, unit, interval, calibration/source, and owner. Keep household, homestead business, MSP, and future datacenter cost centers separate. A planned system is a scenario with capital cost, expected life, incentives **to verify**, operating cost, uncertainty, and dependencies; it does not create actual savings. Green Button can support utility usage import where a provider offers Download My Data or Connect My Data, but availability is provider-specific.[W4] Home Assistant and Prometheus are possible read-only telemetry sources where they are actually deployed and authorized.[W5][W6] PVWatts v8 can estimate PV production for a proposed array, while measured meters and utility statements establish realized performance.[W7]

## Source-of-truth and integration map

| Fact | Authoritative owner | Hub behavior | First connection |
|---|---|---|---|
| Household budget, limits, goals, reconciliations | New hub | Read/write with version and audit | Workbook import, manual entry |
| Bank and card movements | Institution statement/feed | Immutable raw record; normalized and matched copy | CSV/OFX/QFX where available; aggregator later |
| Household grocery purchase and pantry movement | Marketlist | Link by receipt/trip/lot ID; do not create a second pantry | Versioned read API/export |
| Commercial farm inventory and sales | ERPNext if configured for farm entity | Read approved stock/invoice references | Contract discovery before build |
| Kecktech invoices, payables, journals | ERPNext | Read posted state; draft-only proposal path | Frappe REST API after live contract review |
| Workflow orchestration | n8n only if reconciled and accepted | Trigger imports/reminders; not a source of financial truth | Narrow service credentials |
| Infrastructure usage and cost | Meter, bill, telemetry owner | Store dated aggregates and provenance | Files/read-only APIs |
| Operational service health | Existing Ops/NetOps/Sovereign owners | Read summarized status only | No financial data sent back by default |
| AI scheduling and answer evidence | Nexus/GPU Broker governance when used | Send minimized evidence through a separately approved contract | No direct model or tool execution from financial data |

ERPNext's documented REST API exposes business documents, including sales/purchase invoices and payments; a submitted sales invoice has ledger effect. That supports the ownership choice, but the deployed instance and permissions remain to be verified.[W8][W9] The existing [Unified Assistant ADR][R4] places model scheduling behind GPU Broker and separates read and write authority; the finance design should align if integrated with Nexus, without granting a model bank credentials or autonomous spending authority.

**Integration contract:** Each adapter supplies `source_system`, `source_record_id`, `source_revision`, `owner_scope`, `observed_at`, `effective_at`, `ingested_at`, `unit/currency`, `raw_evidence_hash`, `classification_status`, and `sync_status`. Upserts use `(source_system, source_record_id, revision)` for idempotency. Replays preserve prior revisions; corrections append a superseding record. Deletion from an upstream feed becomes a tombstone and an exception, never a silent disappearance. A source outage shows the age of the last good sample and marks analysis stale.

**Marketlist bridge:** Start with read-only food-spend, price, purchase-line, pantry, and harvest summaries. Link a Marketlist trip to one or more bank transactions by date, merchant, amount, and explicit user confirmation when ambiguous. The receipt total and bank debit must not both count as spending. Marketlist maintains quantity and price detail; the hub maintains cash impact and category budget. A later write contract may send the current grocery envelope and alert threshold to Marketlist, but Marketlist must opt into that schema and enforce household authorization server-side.

**ERPNext bridge:** Phase 1 reads posted invoices, payment state, business entities/cost centers, and account summaries. Phase 2 may prepare draft purchase invoices, expense claims, or stock transfers with source evidence and a human approval step. Do not post journals from a model response. Finance exports should preserve ERPNext document ID, posting date, tax category, evidence URI/hash, and reviewer rather than silently translating a business number into the personal ledger.

**n8n bridge:** Use n8n for schedules, email/statement ingestion where authorized, and reminders. Keep parsing, matching, allocation, accounting rules, and idempotency in the hub's versioned application logic. A failed workflow must produce a visible failed import with alert and retry state. No success-by-timeout.

## Canonical data model

The minimum persisted objects are `Party/Entity` (person, household, farm business, Kecktech company, planned datacenter), `Scope` and membership, `Account`, `Statement`, `SourceDocument`, `RawTransaction`, `NormalizedTransaction`, `Match`, `Split/Allocation`, `BudgetVersion`, `Category`, `BillContract`, `IncomeSchedule`, `Goal`, `InventoryReference`, `ResourceMeter`, `ResourceSample`, `Asset`, `Scenario`, `Opportunity`, `Action`, `Outcome`, and `AuditEvent`. Every object carries an owner scope and provenance. Sensitive source documents are encrypted object storage with a database pointer and content hash; raw files never enter Git, Notion, model prompts, or dashboard logs.

Use integer minor currency units plus ISO currency code for monetary values. Keep decimal quantities with explicit units and conversion factors for mass, volume, energy, thermal energy, and time. Store timestamps in UTC with original source timezone, billing period, and fiscal period. Do not transform kWh to dollars without an effective tariff, fixed fees, demand charges, taxes, and net-metering rules. Store model assumptions as versioned scenario inputs.

**Ledger semantics:** The hub's personal register supports double-entry-like balance checks for account reconciliation and transfer matching, even if the UI presents simple categories. Business accounting remains in ERPNext. A transaction import can be pending, posted, reversed, refunded, duplicate candidate, transfer candidate, or reconciled. A bill can be scheduled, received, paid, overdue, disputed, or canceled. A bank debit may satisfy a bill only after a match is accepted; the planned bill itself is not actual spending. Separate gross income, transfers, refunds, reimbursements, debt principal, interest, and asset acquisition.

**Shared use:** Maintain one source event and multiple explicit allocations whose percentages sum to 100%. A split stores purpose, method (metered, area, time, units, mileage, manual), evidence, effective dates, and approver. For example, a utility invoice belongs to the payer; meter-based cost allocations to household, farm, and datacenter are derived analytical views unless posted to ERPNext by an approved workflow. The financial report must identify whether a figure is cash, accrual, allocated management cost, or tax-reviewed booked cost.

## Measurement and savings methodology

Every recommendation is an `Opportunity` with target bill/resource, owner, hypothesis, baseline period, data quality, proposed action, estimated one-time cost, recurring cost, savings range, nonfinancial tradeoffs, deadline, reviewer, and outcome. The engine ranks by expected net benefit, confidence, effort, payback, resilience, quality, and environmental impact. User-defined hard constraints (for example, local/fresh food or reliability floor for hosting) override price minimization.

**Bills and debt:** Compare contract price, fees, utilization, renewal dates, available alternatives, switching cost, service quality, and cancellation conditions. Generate a reviewable call script or negotiation packet; never contact a provider, change a plan, refinance, or cancel automatically. Debt suggestions must include interest rates, terms, fees, and cash-flow effects; no inferred payoff gain without statements.

**Groceries:** Normalize comparable product, unit, grade/quality, store, date, travel/delivery cost, waste, and stock on hand. Show price per edible unit and basket total, not isolated shelf price. Prefer actual Marketlist receipts and dated vendor quotes. Open Food Facts is useful for product metadata but explicitly warns its data may be incomplete and carries reuse-license obligations; USDA FoodData Central is for food/nutrient data, not local shelf prices.[W10][W11] “Local,” “natural,” “organic,” humane, or fresh claims need explicit source, definition, and evidence; labels are not interchangeable.

**Energy:** Compare bill-to-bill cost only after normalizing usage, weather, tariff, occupancy, and service changes. Track gross solar generation, self-consumption, export, curtailment, and grid import separately. Calculate avoided cost from time-of-use-matched self-consumption; export credit from actual tariff; subtract operating and financing cost before net benefit. A geothermal or heat-pump scenario compares delivered thermal energy to electric input (COP) and the actual displaced heating/cooling baseline; DOE notes site and equipment determine results.[W12] Datacenter efficiency uses facility and IT energy, cooling, load, and uptime together; reducing kWh by violating availability targets is not a valid recommendation.

**Outcome verification:** `projected_annual_savings` is not `realized_savings`. Realized outcome requires a post-change period, comparable baseline, assumptions, quality flag, and a link to bills/meter readings. Display uncertainty intervals and flag missing evidence. Savings can be financial, time, waste, carbon estimate, or resilience benefit, but each has its own unit and method. Do not sum unlike benefits.

## User experience

The home view answers: cash available after committed bills; next due payments; income versus expectation; unreconciled transactions; budget remaining; highest-confidence savings actions; food stock at risk; energy anomalies; and business invoice/expense exceptions. Each number opens to its transactions, receipts, meter readings, or ERPNext source. Filters switch between Personal, Household, Homestead Household, Farm Business, Kecktech MSP, and Future Datacenter. The combined view shows cross-scope totals only when definitions are compatible and excludes inter-scope transfers.

An `Import review` queue shows unknown columns, duplicate candidates, unmatched statements, uncertain merchant/category, tax allocation, and invalid sensor units. An `Evidence` drawer gives the source, observed time, age, confidence, transformation, and reviewer. An `Actions` workspace turns advice into tasks with baseline and follow-up date. A `Year-end` workspace exports income and expense summaries by entity, asset register, mileage/usage allocations, invoices, receipts, missing-document list, and reconciliation status. It does not label a return “ready” when exceptions remain.

## Privacy, security, and AI boundaries

The private release needs separate authorization scopes for household member, farm operator, Kecktech bookkeeper, finance reviewer, and system adapter. Enforce server-side scope checks on every record and export. Shared household access does not imply access to business, client, payroll, or bank data. Use least-privilege read credentials for source adapters, encrypted transport and storage, short-lived sessions, audit of views/exports/changes, backup with restore tests, defined retention/deletion, and redacted logs. The existing project policy sets OWASP ASVS 5.0 L2 and other secure-development baselines; OWASP describes ASVS 5.0 as the current verification standard.[W13]

AI receives a bounded, consented evidence packet with aggregate figures and source IDs, not raw statements or unrestricted document search. It may explain patterns, identify anomalies, compare scenarios, draft negotiations, and propose categorization. It may not declare tax treatment, post journals, contact vendors, change utility settings, control infrastructure, move money, or generate source facts. Every answer distinguishes observed facts from assumptions and includes citations to internal evidence. A user explicitly approves consequential actions outside the model. If the model or source is unavailable, the UI says so and retains deterministic reporting.

Bank-feed consent should be explicit, revocable, and scoped. September 2026 CFPB guidance notes the Personal Financial Data Rights rule's compliance dates were stayed in October 2025; do not design against a presumed effective deadline or legal entitlement without renewed counsel review.[W14] Plaid's `transactions/sync` and recurring endpoint are potential later adapters; recurring is an add-on and coverage/latency vary. Pending transactions can be removed and replaced when posted, so the import matcher must support that lifecycle.[W15][W16] Start with manual statement import to prove reconciliation before paying for or storing credentials for aggregation.

## Delivery sequence and gates

**0 — Discovery and contract proof.** The current OneDrive workbook and historical Downloads copy have been compared structurally; the source-to-field map above records the current workbook. Obtain sample statements, list of institutions, business entities and tax professional's accounting categories, Marketlist data dictionary and access path, ERPNext instance contract, utility provider/export formats, meter map, and current live-to-Git disposition. ADR-004 covers the offline core boundary; a service/auth/data-flow ADR remains for later deployment. No production touch. Acceptance: approved privacy classification and source contracts for every proposed feed.

**1 — Personal trust baseline.** Private app; workbook plan import with preview; live permissioned account feeds and automated bill/statement delivery; immutable transaction register; duplicate/transfer handling; monthly reconciliation; scheduled bills/income; categories, limits, goals; source drilldown and export. Routine manual file imports are not a release workflow. Acceptance: two consecutive real statement periods reconcile to zero unexplained difference, including refunds, pending-to-posted changes, transfers, split purchases, and duplicate events. Every required source has a proven automated route or an explicit coverage gap. This is the first usable release.

**2 — Marketlist and savings.** Read-only household integration, grocery budget envelope, receipt-to-bank matching, price/quality provenance, opportunity tracking, bill change detection, and evidence-backed suggestions. Acceptance: receipt lines and bank totals never double count; stale Marketlist data is identified; one opportunity can be followed through to a verified outcome.

**3 — Business/tax package.** ERPNext read integration, per-entity business views, receipt and purpose capture, shared-use allocation, asset register, year-end export and exception list. Accountant reviews category mappings and farm treatment before enabling automated draft creation. Acceptance: sample periods tie to ERPNext and source documents; personal and business totals remain separate; unmapped items block a “complete” export.

**4 — Resource systems.** Utility bill and interval imports, energy/thermal/water meters, equipment allocation, benchmark and scenario engine, datacenter cost model. Begin with existing meters; mark solar/geothermal/datacenter as planned until installed and verified. Acceptance: units, time intervals, meter gaps, tariff version, and uncertainty are visible; no unmeasured savings are reported as realized.

**5 — Product expansion.** Evaluate controlled ERPNext drafts, multi-household isolation, and externally accessible identity after threat model, operational acceptance, support plan, pricing, and licensing review. Live account/bill acquisition and workflow observability are Phase 1 requirements, not deferred enhancements. Do not let a private architecture accidentally become a multi-tenant production service.

**Local implementation checkpoint (2026-09-14):** [ADR-004](../adr/ADR-004-finance-core-local-boundary.md) records an isolated offline finance core. It imports both verified workbook layouts and posted bank/card CSV into a user-selected database outside Git, preserves source hashes and row provenance, treats budget entries as plans, records separate bill/income schedules and category limits, supports explicit transaction review, and calculates preliminary statement differences and monthly reviewed totals. A credit-card payment can be marked as a transfer and excluded from spending. Nine synthetic unit tests pass; read-only in-memory imports returned 29 historical lines (one unbudgeted) and 924 current period-plan lines. This is **LOCALLY VERIFIED — NOT DEPLOYED**. It has no web UI, account-feed connection, bill payment, AI advice, ERPNext/Marketlist integration, or acceptance against real statement periods. Do not treat this checkpoint as completion of Phase 1.

**Connection-independent build checkpoint (2026-09-14):** [ADR-005](../adr/ADR-005-finance-source-provenance-and-freshness.md) adds a local source identity, event revision/hash, and sync freshness model. It does not mark registration as connectivity or store raw payloads. The core also suggests unique, equal-and-opposite cross-account transfer candidates without classifying them, reducing the risk of counting card payments as spending twice when accounts are eventually connected. Fifteen synthetic tests pass; no live adapter, consent flow, encrypted evidence store, mailbox integration, or real-source acceptance exists yet. Provider selection follows the operator's workbook review.

**Private application checkpoint (2026-09-15):** [ADR-006](../adr/ADR-006-private-desktop-finance-screen.md) through [ADR-010](../adr/ADR-010-cross-domain-read-models.md) now implement a styled local Windows application over schema version 12. It includes month navigation, planned and reviewed totals, transaction classification, recurring bill/income planning, received-bill revision history and explicit partial payment allocation, provider-statement arithmetic checks, goals and reviewed spending limits, connection freshness, conservative savings signals, MarketList pantry snapshots, submitted ERPNext business/tax exceptions and review export, resource measurements, database integrity checking, and verified backup. Forty-six synthetic tests pass as of 2026-09-15; local UI startup and all owner-scope views pass. This is **LOCALLY VERIFIED — NOT DEPLOYED**. No provider adapter, live consent, token vault, mailbox retrieval, account completeness proof, ERPNext/MarketList production authorization, tariff model, shared-use allocation, accountant-approved tax mapping, application-level database encryption, or real-period acceptance exists. Those remain explicit release gates rather than simulated features.

**Private screen checkpoint (2026-09-14):** [ADR-006](../adr/ADR-006-private-desktop-finance-screen.md) adds a local desktop view for monthly plan, reviewed actuals, transaction review, spending limits, goal targets, source health, and preliminary balance check. It does not run a web server or touch the production dashboard. Empty actual feeds and unverified goal progress display unavailable. The Windows UI starts against an in-memory test database, and its read model and goal rules are covered by synthetic tests. It is still not a connected release; the operator is supplying provider and bank site details separately.

**Account-feed lifecycle checkpoint (2026-09-14):** [ADR-007](../adr/ADR-007-account-feed-transaction-lifecycle.md) adds a provider-neutral local ingestion path for pending, posted, modified, and removed account events. One current row per provider record prevents revision double-counting; changes invalidate prior classifications and tombstones stay auditable. Summaries and statement arithmetic use posted rows only. This is not a live connector: no institution credentials, consent flow, webhooks, raw evidence vault, or provider-specific adapter has been configured or tested.

Release gates across every phase: clean build, policy checks, contract and migration tests, authorization tests including cross-scope denial, invalid input, duplicate and stale imports, failure/timeout/retry behavior, accessibility, backup/restore, observability, and rollback. Production rollout waits for accepted live-to-Git reconciliation and explicit deployment approval under [canonical governance][N3]. KT-DNS-001 prohibits the listed infrastructure mutations without exact separate target/action approval.

## Decisions still required

1. Which legal entities and tax methods apply to the farm, Kecktech, and any future datacenter? Record entity and accounting-method effective dates rather than embedding one assumption.
2. Which workbook is the starting budget, and which two statement periods can be used for private acceptance without placing real data in Git?
3. Which accounts, utilities, Marketlist household, and ERPNext company are in phase one, and who may view each?
4. Which shared costs require allocation now, and what evidence determines each percentage?
5. What freshness, local sourcing, animal welfare, carbon, reliability, and time constraints are hard rules versus preferences?
6. Which utility and meter feeds actually exist? Do not select Green Button, Home Assistant, or Prometheus adapters on assumption.

## Sources

Internal sources are private and reflect their stated capture time, not a fresh live verification.

- [N1] [Kecktech Homestead — Project Hub](https://app.notion.com/p/34f92bae8322819da136d549b542413b), captured 2026-09-14 UTC.
- [N2] [Kecktech Operations — 2026-08-18](https://app.notion.com/p/3c092bae8322815ab98ddca2f0093ed0), operational handoff.
- [N3] [Kecktech Infrastructure Recovery & Development Governance — Canonical Execution Plan](https://app.notion.com/p/3c092bae8322815da9eef17b349a79d3), updated 2026-08-19.
- [N4] [Known Issues / Cleanup Backlog](https://app.notion.com/p/3be92bae832281ee8feec4954b217a7e), updated 2026-08-19.
- [N5] [VM Registry & Services](https://app.notion.com/p/35192bae832281d6ad06eef5dae7e30b), August 2026 evidence.
- [R1] Marketlist `F:/Github/grocery-app/README.md`, local read 2026-09-13.
- [R2] Marketlist `F:/Github/grocery-app/apps/api/src/routes/index.ts`, local read 2026-09-13.
- [R3] Dashboard `dashboard/src/lib/services.ts`, local read 2026-09-13.
- [R4] Dashboard `docs/adr/ADR-003-unified-assistant-trust-boundaries.md`, local read 2026-09-13.
- [R5] Household expense workbook `C:/Users/jonkd/Downloads/household_expense_baseline_1.xlsx`, `Read Me!A1:A23`, `Household Budget!A1:E63`, `Summary!A1:C16`, local read-only inspection 2026-09-13. This is a historical copy; the newer OneDrive file was not readable.
- [W1] IRS, [What kind of records should I keep](https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep), accessed September 2026.
- [W2] IRS, [Income & Expenses 1](https://www.irs.gov/faqs/small-business-self-employed-other-business/income-expenses/income-expenses-1), accessed September 2026.
- [W3] IRS, [Publication 225, Farmer's Tax Guide](https://www.irs.gov/publications/p225), 2025 edition, accessed September 2026.
- [W4] Green Button Alliance, [Green Button for Residential Use](https://www.greenbuttondata.org/residential.html), accessed September 2026.
- [W5] Home Assistant, [REST API](https://developers.home-assistant.io/docs/api/rest/), accessed September 2026.
- [W6] Prometheus, [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/), accessed September 2026.
- [W7] National Laboratory of the Rockies, [PVWatts API v8](https://developer.nlr.gov/docs/solar/pvwatts/), accessed September 2026.
- [W8] Frappe, [REST API](https://docs.frappe.io/framework/user/en/guides/integration/rest_api), accessed September 2026.
- [W9] ERPNext, [Sales Invoice](https://docs.frappe.io/erpnext/sales-invoice) and [Purchase Invoice](https://docs.frappe.io/erpnext/purchase-invoice), accessed September 2026.
- [W10] Open Food Facts, [API and license documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/), accessed September 2026.
- [W11] USDA, [FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/), accessed September 2026.
- [W12] US Department of Energy, [Heat Pump Systems](https://www.energy.gov/energysaver/heat-pump-systems), accessed September 2026.
- [W13] OWASP, [Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/), accessed September 2026.
- [W14] CFPB, [Personal financial data rights](https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/personal-financial-data-rights/), accessed September 2026.
- [W15] Plaid, [Transactions overview](https://plaid.com/docs/transactions/) and [API](https://plaid.com/docs/api/products/transactions/), accessed September 2026.
- [W16] Plaid, [Transaction states](https://plaid.com/docs/transactions/transactions-data/), accessed September 2026.

[N1]: https://app.notion.com/p/34f92bae8322819da136d549b542413b
[N2]: https://app.notion.com/p/3c092bae8322815ab98ddca2f0093ed0
[N3]: https://app.notion.com/p/3c092bae8322815da9eef17b349a79d3
[N4]: https://app.notion.com/p/3be92bae832281ee8feec4954b217a7e
[N5]: https://app.notion.com/p/35192bae832281d6ad06eef5dae7e30b
[R1]: ../../../grocery-app/README.md
[R2]: ../../../grocery-app/apps/api/src/routes/index.ts
[R3]: ../../dashboard/src/lib/services.ts
[R4]: ../adr/ADR-003-unified-assistant-trust-boundaries.md
[W1]: https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep
[W2]: https://www.irs.gov/faqs/small-business-self-employed-other-business/income-expenses/income-expenses-1
[W3]: https://www.irs.gov/publications/p225
[W4]: https://www.greenbuttondata.org/residential.html
[W5]: https://developers.home-assistant.io/docs/api/rest/
[W6]: https://prometheus.io/docs/prometheus/latest/querying/api/
[W7]: https://developer.nlr.gov/docs/solar/pvwatts/
[W8]: https://docs.frappe.io/framework/user/en/guides/integration/rest_api
[W9]: https://docs.frappe.io/erpnext/sales-invoice
[W10]: https://openfoodfacts.github.io/openfoodfacts-server/api/
[W11]: https://fdc.nal.usda.gov/api-guide/
[W12]: https://www.energy.gov/energysaver/heat-pump-systems
[W13]: https://owasp.org/www-project-application-security-verification-standard/
[W14]: https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/personal-financial-data-rights/
[W15]: https://plaid.com/docs/transactions/
[W16]: https://plaid.com/docs/transactions/transactions-data/
