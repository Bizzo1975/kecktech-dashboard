"""Provider-neutral, revision-aware account transaction ingestion.

An authorized adapter must supply normalized account-perspective amounts and
verified source evidence. This module never authenticates to a provider.
"""

from __future__ import annotations

import hashlib
import sqlite3

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError, cents, iso_date


def ingest_account_event(
    db: sqlite3.Connection, *, source_id: str, record_id: str, revision: str,
    payload_sha256: str, observed_at: str, posting_status: str,
    posted_date: str | None = None, description: str | None = None,
    amount: str | None = None,
) -> dict:
    """Apply one provider snapshot or tombstone atomically; never classify it."""
    source_id = _identifier(source_id, "source ID")
    record_id = _identifier(record_id, "record ID")
    revision = _identifier(revision, "revision")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256 = payload_sha256.lower()
    observed_at = utc_stamp(observed_at)
    if posting_status not in {"pending", "posted", "removed"}:
        raise InputError("Posting status must be pending, posted, or removed")
    if posting_status == "removed":
        if posted_date is not None or description is not None or amount is not None:
            raise InputError("Removed event must not carry a transaction snapshot")
        parsed_date = parsed_description = amount_cents = None
    else:
        if not isinstance(posted_date, str) or not isinstance(description, str):
            raise InputError("Transaction date and description are required")
        parsed_date = iso_date(posted_date)
        parsed_description = description.strip()
        if not parsed_description or len(parsed_description) > 500:
            raise InputError("Transaction description must be 1 to 500 characters")
        amount_cents = cents(amount)
        if amount_cents == 0:
            raise InputError("Transaction amount cannot be zero")

    with db:
        source = db.execute(
            "SELECT source_kind FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] not in {"bank", "credit_card", "loan"}:
            raise InputError("Source is not a registered account feed")
        mapping = db.execute(
            "SELECT import_id,source_row,current_observed_at FROM feed_transaction_map "
            "WHERE source_id=? AND record_id=?", (source_id, record_id),
        ).fetchone()
        existing_event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if existing_event is not None:
            if existing_event["payload_sha256"] != payload_sha256:
                raise InputError("Source revision conflicts with previously recorded evidence")
            if mapping is None:
                raise InputError("Source event exists without an account transaction")
            return {"status": "duplicate", "source_id": source_id, "record_id": record_id}
        if mapping is not None and observed_at <= mapping["current_observed_at"]:
            raise InputError("Event is older than or simultaneous with the current revision")
        if mapping is None and posting_status == "removed":
            raise InputError("Cannot remove an unknown account transaction")

        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) "
            "VALUES (?,?,?,?,?)",
            (source_id, record_id, revision, payload_sha256, observed_at),
        )
        if mapping is None:
            source_digest = hashlib.sha256(("account-feed:" + source_id).encode("utf-8")).hexdigest()
            db.execute(
                "INSERT OR IGNORE INTO imports(kind,sha256,source_name,row_count) VALUES ('account_feed',?,?,0)",
                (source_digest, source_id),
            )
            import_id = db.execute(
                "SELECT id FROM imports WHERE kind='account_feed' AND sha256=?", (source_digest,)
            ).fetchone()["id"]
            source_row = db.execute(
                "SELECT COALESCE(MAX(source_row),0)+1 AS n FROM transactions WHERE import_id=?",
                (import_id,),
            ).fetchone()["n"]
            db.execute(
                "INSERT INTO transactions(import_id,source_row,account,posted_date,description,amount_cents,posting_status) "
                "VALUES (?,?,?,?,?,?,?)",
                (import_id, source_row, source_id, parsed_date, parsed_description,
                 amount_cents, posting_status),
            )
            db.execute(
                "INSERT INTO feed_transaction_map(source_id,record_id,import_id,source_row,current_revision,current_observed_at) "
                "VALUES (?,?,?,?,?,?)",
                (source_id, record_id, import_id, source_row, revision, observed_at),
            )
            db.execute("UPDATE imports SET row_count=row_count+1 WHERE id=?", (import_id,))
            return {"status": "recorded", "source_id": source_id, "record_id": record_id}

        old = db.execute(
            "SELECT posted_date,description,amount_cents,posting_status FROM transactions "
            "WHERE import_id=? AND source_row=?",
            (mapping["import_id"], mapping["source_row"]),
        ).fetchone()
        if old is None:
            raise InputError("Account feed mapping has no transaction row")
        if posting_status == "removed":
            parsed_date = old["posted_date"]
            parsed_description = old["description"]
            amount_cents = old["amount_cents"]
        changed = (
            old["posted_date"] != parsed_date or old["description"] != parsed_description or
            old["amount_cents"] != amount_cents or old["posting_status"] != posting_status
        )
        if changed:
            db.execute(
                "DELETE FROM bill_payment_links WHERE import_id=? AND source_row=?",
                (mapping["import_id"], mapping["source_row"]),
            )
        db.execute(
            "UPDATE transactions SET posted_date=?,description=?,amount_cents=?,posting_status=?, "
            "review_status=CASE WHEN ? THEN 'unreviewed' ELSE review_status END, "
            "economic_type=CASE WHEN ? THEN NULL ELSE economic_type END, "
            "category=CASE WHEN ? THEN NULL ELSE category END "
            "WHERE import_id=? AND source_row=?",
            (parsed_date, parsed_description, amount_cents, posting_status,
             changed, changed, changed, mapping["import_id"], mapping["source_row"]),
        )
        db.execute(
            "UPDATE feed_transaction_map SET current_revision=?,current_observed_at=? "
            "WHERE source_id=? AND record_id=?",
            (revision, observed_at, source_id, record_id),
        )
    return {"status": "updated", "source_id": source_id, "record_id": record_id,
            "review_reset": changed}
