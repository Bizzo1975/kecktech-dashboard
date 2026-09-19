# ADR-009: Explicit bill payment allocation

Status: Accepted for local implementation, 2026-09-14.

The hub may link a received bill to one or more posted account withdrawals, but never infers payment from a matching amount, date, or description. A person explicitly allocates a positive amount from a reviewed expense transaction. The bill and account feed must have the same owner scope. The sum of allocations cannot exceed either the current bill amount or the account withdrawal; multiple payments and split withdrawals are supported by the link table.

The UI calls this amount **Linked**, not paid or reconciled. An allocation proves only that a user associated two current source records. It does not prove the biller credited the account, the bank statement reconciled, or the payment was timely. Re-reviewing the transaction, a changed/removed account event, or a corrected/voided bill clears affected links, requiring explicit re-review. Exact repeat links are idempotent; conflicting repeats must be unlinked before replacement. Bill corrections and account changes retain their source event evidence.

The local database migration adds `bill_payment_links` in schema version 8. It does not modify ERPNext payables or create payment instructions. A provider-specific reconciliation contract will be needed before showing a true **Paid** status.
