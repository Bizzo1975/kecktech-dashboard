"""Conservative local signals from observed bills and reviewed spending."""

from __future__ import annotations

import sqlite3
from datetime import date

from .core import monthly_summary


def _money(amount_cents: int) -> str:
    whole, fraction = divmod(amount_cents, 100)
    return f"${whole:,}.{fraction:02d}"


def savings_signals(db: sqlite3.Connection, month: str, owner_scope: str | None = None) -> list[dict]:
    """Return evidence-backed review prompts, never projected or realized savings."""
    summary = monthly_summary(db, month, owner_scope)
    signals = []
    if summary["imported_rows"]:
        for row in summary["spending_limits"]:
            if row["reviewed_spending_cents"] > row["limit_cents"]:
                signals.append({
                    "kind": "limit_overrun", "subject": row["category"],
                    "headline": "Reviewed spending exceeds the monthly limit",
                    "detail": (f"Reviewed spending {_money(row['reviewed_spending_cents'])}; "
                               f"limit {_money(row['limit_cents'])}. "
                               + ("Other transactions still need review." if summary["unreviewed_rows"] else
                                  "Statement completeness still needs reconciliation.")),
                    "evidence": f"reviewed transactions in {month}",
                    "estimated_savings_cents": None,
                })
    bills = db.execute(
        "SELECT b.source_id,b.bill_id,b.description,b.amount_due_cents,b.service_start,b.service_end "
        "FROM bill_documents b JOIN connection_sources s ON s.source_id=b.source_id "
        "WHERE b.state='received' AND b.service_start IS NOT NULL " +
        ("AND s.owner_scope=? " if owner_scope else "") +
        "ORDER BY b.source_id,b.description,b.service_end,b.bill_id LIMIT 10001"
    , ([owner_scope] if owner_scope else [])).fetchall()
    if len(bills) > 10000:
        from .core import InputError
        raise InputError("More than 10000 current bills; analysis needs a narrower scope")
    previous: dict[tuple[str, str], sqlite3.Row] = {}
    for bill in bills:
        key = (bill["source_id"], bill["description"].casefold())
        older = previous.get(key)
        previous[key] = bill
        if older is None or older["amount_due_cents"] <= 0:
            continue
        if bill["service_start"] <= older["service_end"]:
            continue
        if bill["service_end"][:7] != month:
            continue
        current_days = (date.fromisoformat(bill["service_end"]) - date.fromisoformat(bill["service_start"])).days + 1
        older_days = (date.fromisoformat(older["service_end"]) - date.fromisoformat(older["service_start"])).days + 1
        if current_days != older_days:
            continue
        increase = bill["amount_due_cents"] - older["amount_due_cents"]
        if increase < 500 or increase * 10 < older["amount_due_cents"]:
            continue
        signals.append({
            "kind": "bill_increase", "subject": bill["description"],
            "headline": "Bill amount increased; inspect charges and usage",
            "detail": (f"Previous {_money(older['amount_due_cents'])}; current {_money(bill['amount_due_cents'])}; "
                       f"increase {_money(increase)} across equal {current_days}-day service periods. "
                       "Usage, tariff, fees and taxes have not been normalized."),
            "evidence": f"{bill['source_id']} bills {older['bill_id']} and {bill['bill_id']}",
            "estimated_savings_cents": None,
        })
    return signals
