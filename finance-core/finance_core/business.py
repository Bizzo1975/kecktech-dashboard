"""Read-only, revision-aware business records from an accounting authority."""

from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

from .connections import DIGEST, _identifier, utc_stamp
from .core import InputError, cents, iso_date

DOCUMENT_TYPES = {"sales_invoice", "purchase_invoice", "payment", "expense_claim", "asset"}


def ingest_business_document(
    db: sqlite3.Connection, *, source_id: str, document_id: str, revision: str,
    payload_sha256: str, observed_at: str, document_type: str, document_state: str,
    posting_date: str | None = None, counterparty: str | None = None,
    total: str | None = None, currency_code: str | None = "USD",
    business_purpose: str | None = None, tax_category: str | None = None,
) -> dict:
    source_id = _identifier(source_id, "source ID")
    document_id = _identifier(document_id, "business document ID")
    record_id = _identifier("business:" + document_id, "business record ID")
    revision = _identifier(revision, "revision")
    if document_type not in DOCUMENT_TYPES:
        raise InputError("Unsupported business document type")
    if document_state not in {"submitted", "cancelled"}:
        raise InputError("Business document state must be submitted or cancelled")
    if not isinstance(payload_sha256, str) or not DIGEST.fullmatch(payload_sha256):
        raise InputError("Payload SHA-256 must be 64 hexadecimal characters")
    payload_sha256, observed_at = payload_sha256.lower(), utc_stamp(observed_at)
    if document_state == "cancelled":
        if any(value is not None for value in (posting_date, counterparty, total, business_purpose, tax_category)):
            raise InputError("Cancelled business event must not carry a document snapshot")
        total_cents = currency_code = None
    else:
        if not isinstance(posting_date, str) or not isinstance(counterparty, str) or not counterparty.strip():
            raise InputError("Submitted business record requires posting date and counterparty")
        posting_date = iso_date(posting_date)
        counterparty = counterparty.strip()
        if len(counterparty) > 200:
            raise InputError("Counterparty must be at most 200 characters")
        if not isinstance(total, str):
            raise InputError("Submitted business record requires a total")
        total_cents = cents(total, allow_negative=False)
        if currency_code != "USD":
            raise InputError("Only USD business records are supported until currency conversion is modeled")
        for value, label, limit in ((business_purpose, "Business purpose", 500), (tax_category, "Tax category", 100)):
            if value is not None and (not isinstance(value, str) or len(value.strip()) > limit):
                raise InputError(f"{label} exceeds its supported length")
        business_purpose = business_purpose.strip() if business_purpose else None
        tax_category = tax_category.strip() if tax_category else None
    with db:
        source = db.execute(
            "SELECT source_kind,owner_scope FROM connection_sources WHERE source_id=?", (source_id,)
        ).fetchone()
        if source is None or source["source_kind"] != "erpnext" or source["owner_scope"] not in {"homestead_business", "kecktech", "datacenter"}:
            raise InputError("Source is not a registered business ERPNext feed")
        prior = db.execute(
            "SELECT current_observed_at FROM business_documents WHERE source_id=? AND document_id=?",
            (source_id, document_id),
        ).fetchone()
        event = db.execute(
            "SELECT payload_sha256 FROM source_events WHERE source_id=? AND record_id=? AND revision=?",
            (source_id, record_id, revision),
        ).fetchone()
        if event is not None:
            if event["payload_sha256"] != payload_sha256:
                raise InputError("Business revision conflicts with recorded evidence")
            if prior is None:
                raise InputError("Source event exists without a business document")
            return {"status": "duplicate", "document_id": document_id}
        if prior is not None and observed_at <= prior["current_observed_at"]:
            raise InputError("Business event is older than or simultaneous with the current revision")
        if prior is None and document_state == "cancelled":
            raise InputError("Cannot cancel an unknown business document")
        db.execute(
            "INSERT INTO source_events(source_id,record_id,revision,payload_sha256,observed_at) VALUES (?,?,?,?,?)",
            (source_id, record_id, revision, payload_sha256, observed_at),
        )
        db.execute(
            "INSERT INTO business_documents(source_id,document_id,current_revision,current_observed_at,evidence_sha256,"
            "document_type,document_state,posting_date,counterparty,total_cents,currency_code,business_purpose,tax_category) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,document_id) DO UPDATE SET "
            "current_revision=excluded.current_revision,current_observed_at=excluded.current_observed_at,"
            "evidence_sha256=excluded.evidence_sha256,document_type=excluded.document_type,"
            "document_state=excluded.document_state,posting_date=excluded.posting_date,counterparty=excluded.counterparty,"
            "total_cents=excluded.total_cents,currency_code=excluded.currency_code,"
            "business_purpose=excluded.business_purpose,tax_category=excluded.tax_category",
            (source_id, document_id, revision, observed_at, payload_sha256, document_type,
             document_state, posting_date, counterparty, total_cents, currency_code,
             business_purpose, tax_category),
        )
    return {"status": "recorded" if prior is None else "updated", "document_id": document_id}


def business_year_view(db: sqlite3.Connection, year: int, owner_scope: str | None = None) -> dict:
    if isinstance(year, bool) or not isinstance(year, int) or not 2000 <= year <= 2200:
        raise InputError("Business year must be 2000 to 2200")
    if owner_scope is not None and owner_scope not in {"homestead_business", "kecktech", "datacenter"}:
        return {"year": year, "documents": [], "exception_count": 0, "totals": []}
    rows = db.execute(
        "SELECT b.source_id,s.owner_scope,b.document_id,b.document_type,b.posting_date,b.counterparty,"
        "b.total_cents,b.currency_code,b.business_purpose,b.tax_category "
        "FROM business_documents b JOIN connection_sources s ON s.source_id=b.source_id "
        "WHERE b.document_state='submitted' AND b.posting_date>=? AND b.posting_date<? " +
        ("AND s.owner_scope=? " if owner_scope else "") +
        "ORDER BY b.posting_date,b.source_id,b.document_id LIMIT 1001",
        ([f"{year:04d}-01-01", f"{year + 1:04d}-01-01"] + ([owner_scope] if owner_scope else [])),
    ).fetchall()
    if len(rows) > 1000:
        raise InputError("More than 1000 business records; a narrower view is required")
    documents = []
    exception_count = 0
    totals = {}
    for row in rows:
        item = dict(row)
        missing = []
        if row["document_type"] in {"purchase_invoice", "expense_claim", "asset"}:
            if not row["business_purpose"]:
                missing.append("business purpose")
            if not row["tax_category"]:
                missing.append("tax category")
        item["exception"] = ", ".join(missing)
        exception_count += bool(missing)
        key = (row["owner_scope"], row["document_type"])
        totals[key] = totals.get(key, 0) + row["total_cents"]
        documents.append(item)
    return {"year": year, "documents": documents, "exception_count": exception_count,
            "totals": [{"owner_scope": k[0], "document_type": k[1], "total_cents": v}
                       for k, v in sorted(totals.items())]}


def export_business_year(db: sqlite3.Connection, year: int, destination: str) -> dict:
    view = business_year_view(db, year)
    target = Path(destination).expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[2]
    if target == repo_root or repo_root in target.parents:
        raise InputError("Business export must be outside the repository")
    if not target.parent.is_dir() or (target.exists() and target.is_symlink()):
        raise InputError("Export parent must exist and export cannot be a symlink")
    fields = ("source_id", "owner_scope", "document_id", "document_type", "posting_date",
              "counterparty", "total_cents", "currency_code", "business_purpose",
              "tax_category", "exception")
    try:
        with target.open("x", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(view["documents"])
    except FileExistsError as exc:
        raise InputError("Export file already exists; choose a new name") from exc
    return {"status": "review_export_created", "year": year, "rows": len(view["documents"]),
            "exception_count": view["exception_count"], "tax_ready": False,
            "destination": str(target)}
