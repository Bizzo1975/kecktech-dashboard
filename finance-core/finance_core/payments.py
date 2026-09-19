"""Explicit allocation of verified account withdrawals to received bills."""

from __future__ import annotations

import sqlite3

from .connections import _identifier
from .core import InputError, cents


def link_bill_payment(
    db: sqlite3.Connection, *, bill_source_id: str, bill_id: str,
    import_id: int, source_row: int, amount: str,
) -> dict:
    bill_source_id = _identifier(bill_source_id, "bill source ID")
    bill_id = _identifier(bill_id, "bill ID")
    if any(isinstance(n, bool) or not isinstance(n, int) or n < 1 for n in (import_id, source_row)):
        raise InputError("Transaction identity must be positive integers")
    allocated = cents(amount, allow_negative=False)
    if allocated == 0:
        raise InputError("Payment allocation must be positive")
    with db:
        bill = db.execute(
            "SELECT b.state,b.amount_due_cents,s.owner_scope FROM bill_documents b "
            "JOIN connection_sources s ON s.source_id=b.source_id "
            "WHERE b.source_id=? AND b.bill_id=?", (bill_source_id, bill_id),
        ).fetchone()
        if bill is None or bill["state"] != "received":
            raise InputError("Current received bill not found")
        tx = db.execute(
            "SELECT t.amount_cents,t.review_status,t.economic_type,t.posting_status,s.owner_scope "
            "FROM transactions t JOIN feed_transaction_map m "
            "ON m.import_id=t.import_id AND m.source_row=t.source_row "
            "JOIN connection_sources s ON s.source_id=m.source_id "
            "WHERE t.import_id=? AND t.source_row=?", (import_id, source_row),
        ).fetchone()
        if tx is None or tx["posting_status"] != "posted" or tx["review_status"] != "reviewed" or tx["economic_type"] != "expense":
            raise InputError("A linked payment requires a reviewed posted expense from an account feed")
        if tx["owner_scope"] != bill["owner_scope"]:
            raise InputError("Bill and payment must have the same owner scope")
        existing = db.execute(
            "SELECT allocated_cents FROM bill_payment_links WHERE bill_source_id=? AND bill_id=? "
            "AND import_id=? AND source_row=?",
            (bill_source_id, bill_id, import_id, source_row),
        ).fetchone()
        if existing is not None:
            if existing["allocated_cents"] == allocated:
                return {"status": "duplicate", "allocated_cents": allocated}
            raise InputError("Existing payment link has a different allocation; unlink before changing")
        bill_total = db.execute(
            "SELECT COALESCE(SUM(allocated_cents),0) AS n FROM bill_payment_links "
            "WHERE bill_source_id=? AND bill_id=?", (bill_source_id, bill_id),
        ).fetchone()["n"]
        tx_total = db.execute(
            "SELECT COALESCE(SUM(allocated_cents),0) AS n FROM bill_payment_links "
            "WHERE import_id=? AND source_row=?", (import_id, source_row),
        ).fetchone()["n"]
        if bill_total + allocated > bill["amount_due_cents"]:
            raise InputError("Payment allocations exceed the bill amount")
        if tx_total + allocated > -tx["amount_cents"]:
            raise InputError("Payment allocations exceed the account withdrawal")
        db.execute(
            "INSERT INTO bill_payment_links(bill_source_id,bill_id,import_id,source_row,allocated_cents) "
            "VALUES (?,?,?,?,?)", (bill_source_id, bill_id, import_id, source_row, allocated),
        )
    return {"status": "linked", "allocated_cents": allocated}


def unlink_bill_payment(
    db: sqlite3.Connection, *, bill_source_id: str, bill_id: str,
    import_id: int, source_row: int,
) -> dict:
    bill_source_id = _identifier(bill_source_id, "bill source ID")
    bill_id = _identifier(bill_id, "bill ID")
    if any(isinstance(n, bool) or not isinstance(n, int) or n < 1 for n in (import_id, source_row)):
        raise InputError("Transaction identity must be positive integers")
    with db:
        changed = db.execute(
            "DELETE FROM bill_payment_links WHERE bill_source_id=? AND bill_id=? "
            "AND import_id=? AND source_row=?",
            (bill_source_id, bill_id, import_id, source_row),
        ).rowcount
    return {"status": "unlinked" if changed else "absent"}
