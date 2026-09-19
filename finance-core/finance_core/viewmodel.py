"""Read-only data for the local finance desktop screen."""

from __future__ import annotations

import sqlite3

from .connections import source_health
from .core import monthly_summary


def month_view(db: sqlite3.Connection, month: str, owner_scope: str | None = None) -> dict:
    summary = monthly_summary(db, month, owner_scope)
    latest = db.execute(
        "SELECT MAX(id) AS id FROM imports WHERE kind='budget'"
    ).fetchone()["id"]
    plan_rows = []
    if latest is not None and owner_scope in (None, "household"):
        plan_rows = [dict(row) for row in db.execute(
            "SELECT plan_type,category,item,planned_cents FROM budget_period_lines "
            "WHERE import_id=? AND plan_year=? AND plan_month=? "
            "ORDER BY plan_type,category,item,source_row",
            (latest, int(month[:4]), int(month[5:7])),
        )]
        if not plan_rows:
            plan_rows = [
                {
                    "plan_type": row["plan_type"], "category": row["category"],
                    "item": row["item"], "planned_cents": row["monthly_cents"],
                }
                for row in db.execute(
                    "SELECT plan_type,category,item,monthly_cents FROM budget_lines "
                    "WHERE import_id=? ORDER BY source_row", (latest,)
                )
            ]
    actual_state = (
        "Only pending transactions" if summary["pending_rows"] and summary["imported_rows"] == 0 else
        "No posted transactions" if summary["removed_rows"] and summary["imported_rows"] == 0 else
        "No transaction data" if summary["imported_rows"] == 0 else
        "Partial: review needed" if summary["unreviewed_rows"] else
        "Reviewed rows; reconcile statements"
    )
    return {"summary": summary, "plan_rows": plan_rows, "actual_state": actual_state}


def connection_view(db: sqlite3.Connection, as_of: str, owner_scope: str | None = None) -> list[dict]:
    ids = [row["source_id"] for row in db.execute(
        "SELECT source_id FROM connection_sources " + ("WHERE owner_scope=? " if owner_scope else "") +
        "ORDER BY owner_scope,source_kind,source_id", ([owner_scope] if owner_scope else [])
    )]
    return [source_health(db, source_id, as_of) for source_id in ids]


def bill_view(db: sqlite3.Connection, owner_scope: str | None = None) -> list[dict]:
    """Current received obligations; payment status is intentionally unknown."""
    rows = db.execute(
        "SELECT b.source_id,b.bill_id,b.description,b.amount_due_cents,b.issued_date,b.due_date,"
        "b.service_start,b.service_end,b.state,"
        "COALESCE(SUM(l.allocated_cents),0) AS linked_cents "
        "FROM bill_documents b JOIN connection_sources s ON s.source_id=b.source_id "
        "LEFT JOIN bill_payment_links l "
        "ON l.bill_source_id=b.source_id AND l.bill_id=b.bill_id "
        "WHERE b.state='received' " + ("AND s.owner_scope=? " if owner_scope else "") +
        "GROUP BY b.source_id,b.bill_id "
        "ORDER BY b.due_date,b.source_id,b.bill_id LIMIT 1001"
    , ([owner_scope] if owner_scope else [])).fetchall()
    if len(rows) > 1000:
        from .core import InputError
        raise InputError("More than 1000 current bills; narrow the bill view before display")
    return [dict(row) for row in rows]
