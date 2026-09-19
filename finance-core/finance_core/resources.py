"""Revision-aware physical measurements, kept separate from financial values."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError

METRICS = {"grid_import", "grid_export", "solar_generation", "electricity_use",
           "water_use", "thermal_output", "fuel_use", "it_energy"}
UNITS = {"Wh", "kWh", "gal", "L", "Btu", "therm", "ft3"}


def ingest_resource_measurement(
    db: sqlite3.Connection, *, source_id: str, measurement_id: str, revision: str,
    payload_sha256: str, observed_at: str, metric: str, quantity: str, unit: str,
    interval_start: str, interval_end: str, quality: str, site: str,
) -> dict:
    source_id = _identifier(source_id, "source ID")
    measurement_id = _identifier(measurement_id, "measurement ID")
    record_id = _identifier("measurement:" + measurement_id, "measurement record ID")
    revision = _identifier(revision, "revision")
    if metric not in METRICS or unit not in UNITS or quality not in {"measured", "estimated"}:
        raise InputError("Unsupported resource metric, unit, or quality")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256, observed_at = payload_sha256.lower(), utc_stamp(observed_at)
    try:
        parsed_quantity = Decimal(quantity)
    except (InvalidOperation, TypeError) as exc:
        raise InputError("Resource quantity must be a nonnegative decimal") from exc
    if (not parsed_quantity.is_finite() or parsed_quantity < 0 or parsed_quantity > Decimal("1e15") or
            parsed_quantity.as_tuple().exponent < -6):
        raise InputError("Resource quantity is outside supported precision or range")
    start, end = _utc(interval_start), _utc(interval_end)
    if end <= start:
        raise InputError("Measurement interval end must follow its start")
    if not isinstance(site, str) or not 1 <= len(site.strip()) <= 100:
        raise InputError("Measurement site must be 1 to 100 characters")
    with db:
        source = db.execute(
            "SELECT source_kind FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] not in {"utility_meter", "equipment_meter"}:
            raise InputError("Source is not a registered resource meter")
        prior = db.execute(
            "SELECT current_observed_at FROM resource_measurements WHERE source_id=? AND measurement_id=?",
            (source_id, measurement_id),
        ).fetchone()
        event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if event is not None:
            if event["payload_sha256"] != payload_sha256:
                raise InputError("Measurement revision conflicts with recorded evidence")
            if prior is None:
                raise InputError("Source event exists without a measurement")
            return {"status": "duplicate", "measurement_id": measurement_id}
        if prior is not None and observed_at <= prior["current_observed_at"]:
            raise InputError("Measurement is older than or simultaneous with the current revision")
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) VALUES (?,?,?,?,?)",
            (source_id, record_id, revision, payload_sha256, observed_at),
        )
        db.execute(
            "INSERT INTO resource_measurements(source_id,measurement_id,current_revision,current_observed_at,"
            "evidence_sha256,metric,quantity,unit,interval_start,interval_end,quality,site) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,measurement_id) DO UPDATE SET "
            "current_revision=excluded.current_revision,current_observed_at=excluded.current_observed_at,"
            "evidence_sha256=excluded.evidence_sha256,metric=excluded.metric,quantity=excluded.quantity,"
            "unit=excluded.unit,interval_start=excluded.interval_start,interval_end=excluded.interval_end,"
            "quality=excluded.quality,site=excluded.site",
            (source_id, measurement_id, revision, observed_at, payload_sha256, metric,
             format(parsed_quantity, "f"), unit, start, end, quality, site.strip()),
        )
    return {"status": "recorded" if prior is None else "updated", "measurement_id": measurement_id}


def _utc(value: str) -> str:
    stamp = utc_stamp(value)
    return stamp


def resource_month_view(db: sqlite3.Connection, month: str, owner_scope: str | None = None) -> dict:
    try:
        begin = datetime.strptime(month, "%Y-%m").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise InputError("Month must be YYYY-MM") from exc
    if begin.strftime("%Y-%m") != month:
        raise InputError("Month must be YYYY-MM")
    if begin.month == 12:
        end = begin.replace(year=begin.year + 1, month=1)
    else:
        end = begin.replace(month=begin.month + 1)
    rows = db.execute(
        "SELECT r.source_id,s.owner_scope,r.metric,r.quantity,r.unit,r.interval_start,r.interval_end,"
        "r.quality,r.site FROM resource_measurements r JOIN connection_sources s ON s.source_id=r.source_id "
        "WHERE r.interval_end>? AND r.interval_start<? " +
        ("AND s.owner_scope=? " if owner_scope else "") +
        "ORDER BY s.owner_scope,r.site,r.metric,r.interval_start LIMIT 1001",
        ([begin.isoformat(timespec="seconds").replace("+00:00", "Z"),
          end.isoformat(timespec="seconds").replace("+00:00", "Z")] + ([owner_scope] if owner_scope else [])),
    ).fetchall()
    if len(rows) > 1000:
        raise InputError("More than 1000 measurements this month; a narrower view is required")
    totals = {}
    boundary_spanning = 0
    for row in rows:
        if row["interval_start"] < begin.isoformat(timespec="seconds").replace("+00:00", "Z") or row["interval_end"] > end.isoformat(timespec="seconds").replace("+00:00", "Z"):
            boundary_spanning += 1
            continue
        key = (row["owner_scope"], row["site"], row["metric"], row["unit"], row["quality"])
        totals[key] = totals.get(key, Decimal(0)) + Decimal(row["quantity"])
    return {"month": month, "measurements": [dict(row) for row in rows],
            "totals": [{"owner_scope": key[0], "site": key[1], "metric": key[2],
                        "unit": key[3], "quality": key[4], "quantity": format(value, "f")}
                       for key, value in sorted(totals.items())],
            "boundary_spanning": boundary_spanning, "financial_value": None}
