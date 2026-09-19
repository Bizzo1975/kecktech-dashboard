# Finance and Resource Hub — private local application

This is the private local Finance and Resource Hub application. It stores its SQLite database **outside Git** and provides a desktop dashboard for household planning, reviewed account activity, bills and payment allocation, source statements, goals and limits, evidence-backed savings signals, MarketList pantry snapshots, submitted ERPNext business records, and physical resource measurements. It does not connect to providers, move money, post accounting entries, or make final tax classifications.

The local source-provenance module records an opaque source ID, owner scope, source kind, expected update interval, event identity/revision/evidence hash, and successful or failed sync time. It identifies duplicate or conflicting revisions and reports never-synced, fresh, stale, or error state. **It contains no live provider adapter, credentials, or raw event payloads; registering a source does not connect it.** See [ADR-005](../docs/adr/ADR-005-finance-source-provenance-and-freshness.md). This foundation can be wired to provider-specific, permissioned connectors after their coverage and consent are verified.

The provider-neutral account-feed path accepts a registered bank/card/loan source's pending, posted, changed, and removed transaction events. It keeps one current transaction per provider record, retains revision hashes, rejects conflicting or older updates, resets human review when financial facts change, and excludes pending/removed entries from actuals and balance checks. It is an internal ingestion contract, **not a connected bank feed**; a future adapter must authenticate, verify consent and source evidence, normalize signs/status, and report sync success only after a complete pass. See [ADR-007](../docs/adr/ADR-007-account-feed-transaction-lifecycle.md).

Requires Python 3.11+ and `openpyxl==3.1.5`. The input workbook is read-only and never changed. The database location is mandatory; choose a private folder with access controls and backups.

For the private desktop screen on Windows, run `pwsh -NoProfile -File .\launch-local.ps1` from this directory. It uses an installed desktop Python with Tk; on this host it can use the bundled `openpyxl` package if the desktop Python does not have it. The app stores its database under the current user's local application data by default, outside Git. You can select the budget workbook in the screen as a one-time setup step. The screen shows monthly plan and reviewed transaction amounts, transaction review, monthly spending limits, goal targets, source sync health, and a preliminary statement balance check. Goal progress is unavailable until verified account activity can support it. **It does not connect to a bank or biller yet**, and it never turns an empty transaction feed into a zero-dollar actual. See [ADR-006](../docs/adr/ADR-006-private-desktop-finance-screen.md).

```powershell
python -m finance_core --db C:\private\finance.db init
python -m finance_core --db C:\private\finance.db import-budget --file C:\private\household_expense_baseline_1.xlsx
python -m finance_core --db C:\private\finance.db import-transactions --file C:\private\checking.csv --account checking --date-column Date --description-column Description --amount-column Amount
python -m finance_core --db C:\private\finance.db list-transactions --account checking --month 2026-08
python -m finance_core --db C:\private\finance.db transfer-candidates --max-days 3
python -m finance_core --db C:\private\finance.db review-transaction --import-id 2 --row 2 --type expense --category Food
python -m finance_core --db C:\private\finance.db add-schedule --kind bill --name Power --amount 75.00 --frequency monthly --next-date 2026-09-20 --category Utilities
python -m finance_core --db C:\private\finance.db set-limit --category Food --monthly 700.00
python -m finance_core --db C:\private\finance.db monthly-summary --month 2026-08
python -m finance_core --db C:\private\finance.db reconcile --account checking --start 2026-08-01 --end 2026-08-31 --opening 1000.00 --closing 900.00
python -m finance_core --db C:\private\finance.db status
```

Transaction amounts are signed from the **account's perspective**: deposits positive, withdrawals negative. For a file with separate debit and credit columns, use `--debit-column` and `--credit-column` instead of `--amount-column`. Review the bank's sign convention before importing. Dates accept ISO `YYYY-MM-DD` or US `MM/DD/YYYY`. The reconciler uses only posted rows and reports the difference; it never silently adjusts a balance. A zero difference is still a preliminary calculation until all statement rows and pending/posting transitions are reviewed.

Import **posted statement rows only**. Review each transaction before the monthly spending summary treats it as an expense, income, interest, debt principal, refund, or transfer. A credit-card payment is usually a transfer between accounts, while the individual card purchases are expenses. The monthly summary identifies unreviewed rows and never adds transfers to spending. Bill and income schedules are plans, not observed payments. The `list-transactions` command prints private transaction details to the local terminal; use it only in a private session.

`transfer-candidates` finds only unique, opposite-signed, equal-amount movements in different accounts within the requested date window. It does not classify, confirm, or change transactions; ambiguous pairs remain for review.

The importer recognizes both the current OneDrive workbook's `Budget Plan` (year, month, type, category, item, positive planned amount) and the historical `Household Budget` layout. It rejects changed columns rather than guessing. The current workbook's `Transactions`, `Credit Cards`, and `Bill Automation` sheets are not imported; they require separate review and source-specific contracts. The current workbook has no populated transaction rows. Monthly summaries keep planned income and expenses distinct from reviewed statement actuals.

The Bills screen shows received bills from registered biller or mailbox sources. It keeps obligations separate from actual spending. After an account withdrawal has been posted and reviewed as an expense, the user can explicitly link all or part of that withdrawal to a bill. The linked amount cannot exceed either record. Source corrections and transaction re-review clear links for reassessment. This is a local data model and screen; no provider adapter or automatic acquisition is active. See [ADR-008](../docs/adr/ADR-008-bill-document-lifecycle.md) and [ADR-009](../docs/adr/ADR-009-explicit-bill-payment-allocation.md).

Source statements calculate a preliminary account tie-out. The Insights screen reports observed bill increases and reviewed limit overruns without inventing savings. Food shows read-only MarketList pantry snapshots. Business shows submitted ERPNext records and missing year-end details; its CSV is a review export and is never labeled tax-ready. Resources aggregates only complete within-month physical intervals and does not invent energy cost. See [ADR-010](../docs/adr/ADR-010-cross-domain-read-models.md).

Use **Back up data** to copy and integrity-check the private database. The application does not provide application-level encryption; verify that the Windows volume and backup destination are encrypted and access controlled before loading real financial data.

Run synthetic tests with:

```powershell
python -m unittest discover -s tests -v
```
