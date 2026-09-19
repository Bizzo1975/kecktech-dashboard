"""Provider-neutral bill snapshots. A bill is evidence of an obligation, not payment."""

from __future__ import annotations

import sqlite3

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError, cents, iso_date


def ingest_bill_event(
    db: sqlite3.Connection, *, source_id: str, bill_id: str, revision: str,
    payload_sha256: str, observed_at: str, state: str,
    description: str | None = None, amount_due: str | None = None,
    issued_date: str | None = None, due_date: str | None = None,
    service_start: str | None = None, service_end: str | None = None,
) -> dict:
    source_id = _identifier(source_id, "source ID")
    bill_id = _identifier(bill_id, "bill ID")
    revision = _identifier(revision, "revision")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256 = payload_sha256.lower()
    observed_at = utc_stamp(observed_at)
    if state not in {"received", "voided"}:
        raise InputError("Bill state must be received or voided")
    if state == "voided":
        if any(value is not None for value in (
            description, amount_due, issued_date, due_date, service_start, service_end,
        )):
            raise InputError("Voided bill event must not carry a bill snapshot")
        amount_cents = None
    else:
        if not isinstance(description, str) or not description.strip() or len(description.strip()) > 500:
            raise InputError("Bill description must be 1 to 500 characters")
        description = description.strip()
        if not isinstance(amount_due, str):
            raise InputError("Bill amount is required")
        amount_cents = cents(amount_due)
        if amount_cents < 0:
            raise InputError("Bill amount due cannot be negative")
        if not isinstance(issued_date, str) or not isinstance(due_date, str):
            raise InputError("Bill issue and due dates are required")
        issued_date, due_date = iso_date(issued_date), iso_date(due_date)
        if due_date < issued_date:
            raise InputError("Bill due date cannot precede issue date")
        if (service_start is None) != (service_end is None):
            raise InputError("Service period requires both start and end dates")
        if service_start is not None:
            service_start, service_end = iso_date(service_start), iso_date(service_end)
            if service_end < service_start:
                raise InputError("Service period end cannot precede start")

    with db:
        source = db.execute(
            "SELECT source_kind FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] not in {"biller", "mailbox"}:
            raise InputError("Source is not a registered bill feed")
        prior = db.execute(
            "SELECT current_observed_at FROM bill_documents WHERE source_id=? AND bill_id=?",
            (source_id, bill_id),
        ).fetchone()
        event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, bill_id, revision),
        ).fetchone()
        if event is not None:
            if event["payload_sha256"] != payload_sha256:
                raise InputError("Source revision conflicts with previously recorded evidence")
            if prior is None:
                raise InputError("Source event exists without a bill")
            return {"status": "duplicate", "source_id": source_id, "bill_id": bill_id}
        if prior is not None and observed_at <= prior["current_observed_at"]:
            raise InputError("Event is older than or simultaneous with the current revision")
        if prior is None and state == "voided":
            raise InputError("Cannot void an unknown bill")
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) VALUES (?,?,?,?,?)",
            (source_id, bill_id, revision, payload_sha256, observed_at),
        )
        if prior is not None:
            db.execute(
                "DELETE FROM bill_payment_links WHERE bill_source_id=? AND bill_id=?",
                (source_id, bill_id),
            )
        db.execute(
            "INSERT INTO bill_documents(source_id,bill_id,current_revision,current_observed_at,evidence_sha256,"
            "state,description,amount_due_cents,issued_date,due_date,service_start,service_end) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?) "
            "ON CONFLICT(source_id,bill_id) DO UPDATE SET current_revision=excluded.current_revision,"
            "current_observed_at=excluded.current_observed_at,evidence_sha256=excluded.evidence_sha256,"
            "state=excluded.state,description=excluded.description,amount_due_cents=excluded.amount_due_cents,"
            "issued_date=excluded.issued_date,due_date=excluded.due_date,"
            "service_start=excluded.service_start,service_end=excluded.service_end",
            (source_id, bill_id, revision, observed_at, payload_sha256, state, description,
             amount_cents, issued_date, due_date, service_start, service_end),
        )
    return {"status": "recorded" if prior is None else "updated", "source_id": source_id, "bill_id": bill_id}
