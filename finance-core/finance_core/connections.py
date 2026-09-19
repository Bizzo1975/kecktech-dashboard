"""Local provenance and freshness records for future permissioned connectors.

This module makes no network calls and never claims a provider is connected.
Provider adapters must verify consent and retrieve data before using these APIs.
"""

from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone

from .core import InputError

SOURCE_KINDS = frozenset({
    "bank", "credit_card", "loan", "biller", "mailbox", "payroll",
    "marketlist", "erpnext", "utility_meter", "equipment_meter",
})
OWNER_SCOPES = frozenset({
    "personal", "household", "homestead_business", "kecktech", "datacenter",
})
IDENTIFIER = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\Z")
DIGEST = re.compile(r"[0-9a-fA-F]{64}\Z")
ERROR_CODE = re.compile(r"[A-Z][A-Z0-9_]{0,63}\Z")


def utc_stamp(value: str) -> str:
    """Require an offset-aware timestamp and store it in canonical UTC form."""
    if not isinstance(value, str):
        raise InputError("Timestamp must be a string with a UTC offset")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise InputError("Timestamp must be ISO 8601 with a UTC offset") from exc
    if parsed.tzinfo is None:
        raise InputError("Timestamp must include a UTC offset")
    return parsed.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _identifier(value: str, label: str) -> str:
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise InputError(f"Invalid {label}; use an opaque identifier")
    return value


def register_source(
    db: sqlite3.Connection, source_id: str, owner_scope: str,
    source_kind: str, expected_interval_hours: int,
) -> dict:
    source_id = _identifier(source_id, "source ID")
    if owner_scope not in OWNER_SCOPES or source_kind not in SOURCE_KINDS:
        raise InputError("Invalid owner scope or source kind")
    if (isinstance(expected_interval_hours, bool) or
            not isinstance(expected_interval_hours, int) or
            not 1 <= expected_interval_hours <= 8760):
        raise InputError("Expected interval must be 1 to 8760 hours")
    with db:
        db.execute(
            "INSERT INTO connection_sources(source_id,owner_scope,source_kind,expected_interval_hours) "
            "VALUES (?,?,?,?)",
            (source_id, owner_scope, source_kind, expected_interval_hours),
        )
    return {"source_id": source_id, "status": "registered_not_connected"}


def record_source_event(
    db: sqlite3.Connection, source_id: str, record_id: str,
    revision: str, payload_sha256: str, observed_at: str,
) -> dict:
    """Persist source identity and evidence hash, never unencrypted payload bytes."""
    source_id = _identifier(source_id, "source ID")
    record_id = _identifier(record_id, "record ID")
    revision = _identifier(revision, "revision")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    observed_at = utc_stamp(observed_at)
    payload_sha256 = payload_sha256.lower()
    with db:
        if db.execute(
            "SELECT 1 FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone() is None:
            raise InputError("Source is unknown")
        prior = db.execute(
            "SELECT payload_sha256 FROM source_events "
            "WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if prior is not None:
            if prior["payload_sha256"] != payload_sha256:
                raise InputError("Source revision conflicts with previously recorded evidence")
            return {"status": "duplicate", "source_id": source_id}
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) "
            "VALUES (?,?,?,?,?)",
            (source_id, record_id, revision, payload_sha256, observed_at),
        )
    return {"status": "recorded", "source_id": source_id}


def record_sync_result(
    db: sqlite3.Connection, source_id: str, attempted_at: str,
    *, success: bool, error_code: str | None = None,
) -> None:
    source_id = _identifier(source_id, "source ID")
    attempted_at = utc_stamp(attempted_at)
    if not isinstance(success, bool):
        raise InputError("Sync success must be Boolean")
    if success and error_code is not None:
        raise InputError("Successful sync cannot have an error code")
    if not success and (not isinstance(error_code, str) or not ERROR_CODE.fullmatch(error_code)):
        raise InputError("Failed sync requires a safe error code")
    with db:
        changed = db.execute(
            "UPDATE connection_sources SET last_attempt_at=?, "
            "last_success_at=CASE WHEN ? THEN ? ELSE last_success_at END, "
            "last_error_code=? WHERE source_id=? "
            "AND (last_attempt_at IS NULL OR last_attempt_at<=?)",
            (attempted_at, success, attempted_at, error_code, source_id, attempted_at),
        ).rowcount
        if changed != 1:
            raise InputError("Source is unknown or sync timestamp is older than the last attempt")


def source_health(db: sqlite3.Connection, source_id: str, as_of: str) -> dict:
    source_id = _identifier(source_id, "source ID")
    now = datetime.fromisoformat(utc_stamp(as_of).replace("Z", "+00:00"))
    row = db.execute(
        "SELECT owner_scope,source_kind,expected_interval_hours,last_attempt_at,"
        "last_success_at,last_error_code FROM connection_sources WHERE source_id=?",
        (source_id,),
    ).fetchone()
    if row is None:
        raise InputError("Source is unknown")
    last_success = row["last_success_at"]
    if row["last_error_code"]:
        state = "error"
    elif last_success is None:
        state = "never_synced"
    else:
        age = (now - datetime.fromisoformat(last_success.replace("Z", "+00:00"))).total_seconds()
        state = "fresh" if 0 <= age <= row["expected_interval_hours"] * 3600 else "stale"
    return {
        "source_id": source_id,
        "owner_scope": row["owner_scope"],
        "source_kind": row["source_kind"],
        "state": state,
        "last_success_at": last_success,
        "last_error_code": row["last_error_code"],
    }
