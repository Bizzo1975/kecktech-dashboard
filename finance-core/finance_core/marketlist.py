"""Read-only local cache of complete Marketlist household pantry snapshots."""

from __future__ import annotations

import sqlite3
from decimal import Decimal, InvalidOperation

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError, iso_date


def ingest_pantry_snapshot(
    db: sqlite3.Connection, *, source_id: str, household_id: str, revision: str,
    payload_sha256: str, observed_at: str, items: list[dict],
) -> dict:
    source_id = _identifier(source_id, "source ID")
    household_id = _identifier(household_id, "household ID")
    record_id = _identifier("pantry:" + household_id, "pantry record ID")
    revision = _identifier(revision, "revision")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256 = payload_sha256.lower()
    observed_at = utc_stamp(observed_at)
    if not isinstance(items, list) or len(items) > 10000:
        raise InputError("Pantry snapshot must be a complete list of at most 10000 items")
    normalized = []
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            raise InputError("Pantry item must be an object")
        item_id = _identifier(item.get("id"), "pantry item ID")
        if item_id in seen:
            raise InputError("Pantry snapshot has duplicate item IDs")
        seen.add(item_id)
        name, unit = item.get("name"), item.get("unit")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 200:
            raise InputError("Pantry name must be 1 to 200 characters")
        if not isinstance(unit, str) or not 1 <= len(unit.strip()) <= 32:
            raise InputError("Pantry unit must be 1 to 32 characters")
        quantity = item.get("quantity")
        if isinstance(quantity, bool) or quantity is None:
            raise InputError("Pantry quantity must be a nonnegative number")
        try:
            parsed = Decimal(str(quantity))
        except InvalidOperation as exc:
            raise InputError("Pantry quantity must be a nonnegative number") from exc
        if not parsed.is_finite() or parsed < 0 or parsed > 1_000_000 or parsed.as_tuple().exponent < -3:
            raise InputError("Pantry quantity must be nonnegative with at most three decimal places")
        category = item.get("category")
        if category is not None and (not isinstance(category, str) or len(category.strip()) > 100):
            raise InputError("Pantry category must be at most 100 characters")
        expiry = item.get("expiryDate")
        if expiry is not None:
            if not isinstance(expiry, str):
                raise InputError("Pantry expiry must be a date")
            expiry = iso_date(expiry)
        normalized.append((source_id, household_id, item_id, name.strip(),
                           format(parsed, "f"), unit.strip(), category.strip() if category else None,
                           expiry, observed_at))
    with db:
        source = db.execute(
            "SELECT source_kind,owner_scope FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] != "marketlist" or source["owner_scope"] != "household":
            raise InputError("Source is not a registered household Marketlist feed")
        other = db.execute(
            "SELECT 1 FROM source_events WHERE source_id=? AND record_id LIKE 'pantry:%' "
            "AND record_id<>? LIMIT 1", (source_id, record_id),
        ).fetchone()
        if other is not None:
            raise InputError("Marketlist source is already bound to a different household")
        prior = db.execute(
            "SELECT observed_at,payload_sha256 FROM source_events "
            "WHERE source_id=? AND record_id=? ORDER BY observed_at DESC LIMIT 1",
            (source_id, record_id),
        ).fetchone()
        event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if event is not None:
            if event["payload_sha256"] != payload_sha256:
                raise InputError("Pantry revision conflicts with recorded evidence")
            return {"status": "duplicate", "items": len(normalized)}
        if prior is not None and observed_at <= prior["observed_at"]:
            raise InputError("Pantry snapshot is older than or simultaneous with the current snapshot")
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) "
            "VALUES (?,?,?,?,?)", (source_id, record_id, revision, payload_sha256, observed_at),
        )
        db.execute("DELETE FROM marketlist_pantry WHERE source_id=? AND household_id=?",
                   (source_id, household_id))
        db.executemany(
            "INSERT INTO marketlist_pantry(source_id,household_id,item_id,name,quantity,unit,category,expiry_date,observed_at) "
            "VALUES (?,?,?,?,?,?,?,?,?)", normalized,
        )
    return {"status": "recorded", "items": len(normalized)}


def pantry_view(db: sqlite3.Connection) -> dict:
    snapshots = db.execute(
        "SELECT source_id,record_id,MAX(observed_at) AS observed_at FROM source_events "
        "WHERE record_id LIKE 'pantry:%' GROUP BY source_id,record_id ORDER BY source_id"
    ).fetchall()
    items = db.execute(
        "SELECT source_id,household_id,item_id,name,quantity,unit,category,expiry_date,observed_at "
        "FROM marketlist_pantry ORDER BY expiry_date IS NULL,expiry_date,name,item_id LIMIT 1001"
    ).fetchall()
    if len(items) > 1000:
        raise InputError("More than 1000 pantry items; a narrower view is required")
    return {"snapshots": [dict(row) for row in snapshots], "items": [dict(row) for row in items]}
