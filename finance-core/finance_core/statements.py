"""Source-evidenced account statement snapshots and preliminary tie-out."""

from __future__ import annotations

import sqlite3

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError, cents, iso_date


def ingest_account_statement(
    db: sqlite3.Connection, *, source_id: str, statement_id: str, revision: str,
    payload_sha256: str, observed_at: str, period_start: str, period_end: str,
    opening_balance: str, closing_balance: str, currency_code: str = "USD",
) -> dict:
    source_id = _identifier(source_id, "source ID")
    statement_id = _identifier(statement_id, "statement ID")
    record_id = _identifier("statement:" + statement_id, "statement record ID")
    revision = _identifier(revision, "revision")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256 = payload_sha256.lower()
    observed_at = utc_stamp(observed_at)
    period_start, period_end = iso_date(period_start), iso_date(period_end)
    if period_end < period_start:
        raise InputError("Statement period end cannot precede start")
    if currency_code != "USD":
        raise InputError("Only USD statements are supported until account currency is modeled")
    opening, closing = cents(opening_balance), cents(closing_balance)
    with db:
        source = db.execute(
            "SELECT source_kind FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] not in {"bank", "credit_card", "loan"}:
            raise InputError("Source is not a registered account feed")
        prior = db.execute(
            "SELECT current_observed_at FROM account_statements WHERE source_id=? AND statement_id=?",
            (source_id, statement_id),
        ).fetchone()
        event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if event is not None:
            if event["payload_sha256"] != payload_sha256:
                raise InputError("Source revision conflicts with previously recorded evidence")
            if prior is None:
                raise InputError("Source event exists without a statement")
            return {"status": "duplicate", "source_id": source_id, "statement_id": statement_id}
        if prior is not None and observed_at <= prior["current_observed_at"]:
            raise InputError("Statement is older than or simultaneous with the current revision")
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) "
            "VALUES (?,?,?,?,?)", (source_id, record_id, revision, payload_sha256, observed_at),
        )
        db.execute(
            "INSERT INTO account_statements(source_id,statement_id,current_revision,current_observed_at,"
            "evidence_sha256,period_start,period_end,opening_cents,closing_cents,currency_code) "
            "VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,statement_id) DO UPDATE SET "
            "current_revision=excluded.current_revision,current_observed_at=excluded.current_observed_at,"
            "evidence_sha256=excluded.evidence_sha256,period_start=excluded.period_start,"
            "period_end=excluded.period_end,opening_cents=excluded.opening_cents,"
            "closing_cents=excluded.closing_cents,currency_code=excluded.currency_code",
            (source_id, statement_id, revision, observed_at, payload_sha256,
             period_start, period_end, opening, closing, currency_code),
        )
    return {"status": "recorded" if prior is None else "updated", "source_id": source_id,
            "statement_id": statement_id}


def statement_check(db: sqlite3.Connection, source_id: str, statement_id: str) -> dict:
    source_id = _identifier(source_id, "source ID")
    statement_id = _identifier(statement_id, "statement ID")
    statement = db.execute(
        "SELECT a.period_start,a.period_end,a.opening_cents,a.closing_cents,a.currency_code,s.owner_scope "
        "FROM account_statements a JOIN connection_sources s ON s.source_id=a.source_id "
        "WHERE a.source_id=? AND a.statement_id=?",
        (source_id, statement_id),
    ).fetchone()
    if statement is None:
        raise InputError("Statement not found")
    rows = db.execute(
        "SELECT t.posting_status,t.review_status,t.amount_cents FROM transactions t "
        "JOIN feed_transaction_map m ON m.import_id=t.import_id AND m.source_row=t.source_row "
        "WHERE m.source_id=? AND t.posted_date>=? AND t.posted_date<=?",
        (source_id, statement["period_start"], statement["period_end"]),
    ).fetchall()
    posted = [row for row in rows if row["posting_status"] == "posted"]
    movement = sum(row["amount_cents"] for row in posted)
    calculated = statement["opening_cents"] + movement
    difference = statement["closing_cents"] - calculated
    state = ("no_posted_rows_unverified" if not posted else
             "arithmetic_matches_preliminary" if difference == 0 else "difference_needs_review")
    return {
        "source_id": source_id, "statement_id": statement_id,
        "owner_scope": statement["owner_scope"],
        "period_start": statement["period_start"], "period_end": statement["period_end"],
        "currency_code": statement["currency_code"],
        "opening_cents": statement["opening_cents"], "closing_cents": statement["closing_cents"],
        "posted_movement_cents": movement, "calculated_closing_cents": calculated,
        "difference_cents": difference, "posted_rows": len(posted),
        "unreviewed_rows": sum(row["review_status"] != "reviewed" for row in posted),
        "pending_rows": sum(row["posting_status"] == "pending" for row in rows),
        "status": state,
    }


def list_statement_checks(db: sqlite3.Connection) -> list[dict]:
    identities = db.execute(
        "SELECT source_id,statement_id FROM account_statements "
        "ORDER BY period_end DESC,source_id,statement_id LIMIT 101"
    ).fetchall()
    if len(identities) > 100:
        raise InputError("More than 100 statements; a narrower view is required")
    return [statement_check(db, row["source_id"], row["statement_id"]) for row in identities]
