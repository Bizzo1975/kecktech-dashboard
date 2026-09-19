"""Conservative, read-only candidate matching across account transactions."""

from __future__ import annotations

import sqlite3
from datetime import date

from .core import InputError


def transfer_candidates(db: sqlite3.Connection, max_days: int = 3) -> list[dict]:
    """Suggest one-to-one transfers; never classify or count a match as confirmed."""
    if isinstance(max_days, bool) or not isinstance(max_days, int) or not 0 <= max_days <= 14:
        raise InputError("Transfer date window must be 0 to 14 days")
    rows = db.execute(
        "SELECT import_id,source_row,account,posted_date,amount_cents "
        "FROM transactions WHERE review_status='unreviewed' AND posting_status='posted' "
        "AND amount_cents<>0 "
        "ORDER BY posted_date,import_id,source_row"
    ).fetchall()
    candidates = []
    for left in rows:
        if left["amount_cents"] >= 0:
            continue
        matches = []
        left_date = date.fromisoformat(left["posted_date"])
        for right in rows:
            if (right["account"] == left["account"] or
                    right["amount_cents"] != -left["amount_cents"]):
                continue
            if abs((date.fromisoformat(right["posted_date"]) - left_date).days) <= max_days:
                matches.append(right)
        if len(matches) != 1:
            continue
        right = matches[0]
        # A credit matching more than one debit is ambiguous and must not be suggested.
        competing = sum(
            other["amount_cents"] == left["amount_cents"] and
            other["account"] != right["account"] and
            abs((date.fromisoformat(other["posted_date"]) - date.fromisoformat(right["posted_date"])).days) <= max_days
            for other in rows
        )
        if competing != 1:
            continue
        candidates.append({
            "outflow": {"import_id": left["import_id"], "source_row": left["source_row"]},
            "inflow": {"import_id": right["import_id"], "source_row": right["source_row"]},
            "amount_cents": -left["amount_cents"],
            "status": "candidate_only",
        })
    return candidates
