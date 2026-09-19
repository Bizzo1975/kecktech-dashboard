"""Local, read-only-source budget and transaction ingestion.

No network calls, external account access, or financial classification occurs here.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sqlite3
import sys
import zipfile
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openpyxl import load_workbook

MAX_INPUT_BYTES = 25 * 1024 * 1024
MAX_ROWS = 100_000
SCHEMA_VERSION = 12
PLAN_TYPES = {
    "Debt Payments (Non-Mortgage)": "debt_payment_plan",
}


class InputError(ValueError):
    """User-correctable input error."""


def cents(value: object, *, allow_negative: bool = True) -> int:
    if isinstance(value, bool) or value is None:
        raise InputError("A numeric amount is required")
    raw = str(value).strip().replace(",", "")
    if raw.startswith("$"):
        raw = raw[1:]
    if raw.startswith("(") and raw.endswith(")"):
        raw = "-" + raw[1:-1]
    try:
        amount = Decimal(raw)
    except InvalidOperation as exc:
        raise InputError("Invalid amount") from exc
    if not amount.is_finite() or amount.as_tuple().exponent < -2:
        raise InputError("Amount must have at most two decimal places")
    if not allow_negative and amount < 0:
        raise InputError("Amount must be nonnegative")
    result = int(amount * 100)
    if abs(result) > 10**15:
        raise InputError("Amount is outside supported range")
    return result


def iso_date(value: str) -> str:
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise InputError("Date must be YYYY-MM-DD or MM/DD/YYYY")


def source_file(path: str) -> tuple[Path, str]:
    file = Path(path).expanduser().resolve(strict=True)
    if not file.is_file() or file.stat().st_size > MAX_INPUT_BYTES:
        raise InputError("Source must be a file no larger than 25 MiB")
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return file, digest.hexdigest()


def open_db(path: str) -> sqlite3.Connection:
    target = Path(path).expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[2]
    if target == repo_root or repo_root in target.parents:
        raise InputError("Finance database must be outside the repository")
    if not target.parent.is_dir():
        raise InputError("Database parent directory does not exist")
    if target.exists() and target.is_symlink():
        raise InputError("Database path cannot be a symlink")
    db = sqlite3.connect(target)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    return db


def database_health(db: sqlite3.Connection) -> dict:
    result = db.execute("PRAGMA quick_check").fetchone()[0]
    return {"status": "ok" if result == "ok" else "failed", "detail": result}


def backup_database(db: sqlite3.Connection, destination: str) -> dict:
    target = Path(destination).expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[2]
    if target == repo_root or repo_root in target.parents:
        raise InputError("Finance backup must be outside the repository")
    if not target.parent.is_dir() or (target.exists() and target.is_symlink()):
        raise InputError("Backup parent must exist and backup cannot be a symlink")
    source_path = Path(db.execute("PRAGMA database_list").fetchone()[2]).resolve()
    if not str(source_path) or target == source_path:
        raise InputError("Backup must use a different file")
    backup = sqlite3.connect(target)
    try:
        with backup:
            db.backup(backup)
        check = backup.execute("PRAGMA quick_check").fetchone()[0]
        if check != "ok":
            raise InputError("Backup integrity check failed")
    finally:
        backup.close()
    return {"status": "backed_up", "destination": str(target)}


def init_db(db: sqlite3.Connection) -> None:
    tables = {row["name"] for row in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )}
    if "schema_meta" not in tables and tables:
        raise InputError("Database has tables but no finance schema marker")
    if "schema_meta" in tables:
        marker = db.execute("SELECT version FROM schema_meta").fetchone()
        if marker is None or marker["version"] not in range(1, SCHEMA_VERSION + 1):
            raise InputError("Unsupported finance database schema version")
    with db:
        ddl = """
            CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS imports (
                id INTEGER PRIMARY KEY,
                kind TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                source_name TEXT NOT NULL,
                imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                row_count INTEGER NOT NULL,
                UNIQUE(kind, sha256)
            );
            CREATE TABLE IF NOT EXISTS budget_lines (
                import_id INTEGER NOT NULL REFERENCES imports(id),
                source_row INTEGER NOT NULL,
                category TEXT NOT NULL,
                item TEXT NOT NULL,
                monthly_cents INTEGER,
                annual_cents INTEGER,
                plan_type TEXT NOT NULL,
                notes TEXT,
                PRIMARY KEY(import_id, source_row)
            );
            CREATE TABLE IF NOT EXISTS budget_period_lines (
                import_id INTEGER NOT NULL REFERENCES imports(id),
                source_row INTEGER NOT NULL,
                plan_year INTEGER NOT NULL,
                plan_month INTEGER NOT NULL,
                plan_type TEXT NOT NULL CHECK(plan_type IN ('Income','Expense')),
                category TEXT NOT NULL,
                item TEXT NOT NULL,
                planned_cents INTEGER NOT NULL,
                notes TEXT,
                PRIMARY KEY(import_id, source_row)
            );
            CREATE TABLE IF NOT EXISTS transactions (
                import_id INTEGER NOT NULL REFERENCES imports(id),
                source_row INTEGER NOT NULL,
                account TEXT NOT NULL,
                posted_date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                review_status TEXT NOT NULL DEFAULT 'unreviewed',
                economic_type TEXT,
                category TEXT,
                posting_status TEXT NOT NULL DEFAULT 'posted' CHECK(posting_status IN ('pending','posted','removed')),
                PRIMARY KEY(import_id, source_row)
            );
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY,
                kind TEXT NOT NULL CHECK(kind IN ('bill','income')),
                name TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                frequency TEXT NOT NULL CHECK(frequency IN ('weekly','monthly','annual')),
                next_date TEXT NOT NULL,
                category TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS spending_limits (
                category TEXT PRIMARY KEY,
                monthly_cents INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS connection_sources (
                source_id TEXT PRIMARY KEY,
                owner_scope TEXT NOT NULL,
                source_kind TEXT NOT NULL,
                expected_interval_hours INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_attempt_at TEXT,
                last_success_at TEXT,
                last_error_code TEXT
            );
            CREATE TABLE IF NOT EXISTS source_events (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                record_id TEXT NOT NULL,
                revision TEXT NOT NULL,
                payload_sha256 TEXT NOT NULL,
                observed_at TEXT NOT NULL,
                received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(source_id, record_id, revision)
            );
            CREATE TABLE IF NOT EXISTS goals (
                owner_scope TEXT NOT NULL,
                name TEXT NOT NULL,
                target_cents INTEGER NOT NULL CHECK(target_cents > 0),
                target_date TEXT NOT NULL,
                PRIMARY KEY(owner_scope, name)
            );
            CREATE TABLE IF NOT EXISTS feed_transaction_map (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                record_id TEXT NOT NULL,
                import_id INTEGER NOT NULL,
                source_row INTEGER NOT NULL,
                current_revision TEXT NOT NULL,
                current_observed_at TEXT NOT NULL,
                PRIMARY KEY(source_id, record_id),
                UNIQUE(import_id, source_row),
                FOREIGN KEY(import_id, source_row) REFERENCES transactions(import_id, source_row)
            );
            CREATE TABLE IF NOT EXISTS bill_documents (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                bill_id TEXT NOT NULL,
                current_revision TEXT NOT NULL,
                current_observed_at TEXT NOT NULL,
                evidence_sha256 TEXT NOT NULL,
                state TEXT NOT NULL CHECK(state IN ('received','voided')),
                description TEXT,
                amount_due_cents INTEGER,
                issued_date TEXT,
                due_date TEXT,
                service_start TEXT,
                service_end TEXT,
                PRIMARY KEY(source_id,bill_id)
            );
            CREATE TABLE IF NOT EXISTS bill_payment_links (
                bill_source_id TEXT NOT NULL,
                bill_id TEXT NOT NULL,
                import_id INTEGER NOT NULL,
                source_row INTEGER NOT NULL,
                allocated_cents INTEGER NOT NULL CHECK(allocated_cents > 0),
                linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(bill_source_id,bill_id,import_id,source_row),
                FOREIGN KEY(bill_source_id,bill_id) REFERENCES bill_documents(source_id,bill_id),
                FOREIGN KEY(import_id,source_row) REFERENCES transactions(import_id,source_row)
            );
            CREATE TABLE IF NOT EXISTS account_statements (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                statement_id TEXT NOT NULL,
                current_revision TEXT NOT NULL,
                current_observed_at TEXT NOT NULL,
                evidence_sha256 TEXT NOT NULL,
                period_start TEXT NOT NULL,
                period_end TEXT NOT NULL,
                opening_cents INTEGER NOT NULL,
                closing_cents INTEGER NOT NULL,
                currency_code TEXT NOT NULL CHECK(currency_code='USD'),
                PRIMARY KEY(source_id,statement_id)
            );
            CREATE TABLE IF NOT EXISTS marketlist_pantry (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                household_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                name TEXT NOT NULL,
                quantity TEXT NOT NULL,
                unit TEXT NOT NULL,
                category TEXT,
                expiry_date TEXT,
                observed_at TEXT NOT NULL,
                PRIMARY KEY(source_id,household_id,item_id)
            );
            CREATE TABLE IF NOT EXISTS business_documents (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                document_id TEXT NOT NULL,
                current_revision TEXT NOT NULL,
                current_observed_at TEXT NOT NULL,
                evidence_sha256 TEXT NOT NULL,
                document_type TEXT NOT NULL CHECK(document_type IN
                    ('sales_invoice','purchase_invoice','payment','expense_claim','asset')),
                document_state TEXT NOT NULL CHECK(document_state IN ('submitted','cancelled')),
                posting_date TEXT,
                counterparty TEXT,
                total_cents INTEGER,
                currency_code TEXT,
                business_purpose TEXT,
                tax_category TEXT,
                PRIMARY KEY(source_id,document_id)
            );
            CREATE TABLE IF NOT EXISTS resource_measurements (
                source_id TEXT NOT NULL REFERENCES connection_sources(source_id),
                measurement_id TEXT NOT NULL,
                current_revision TEXT NOT NULL,
                current_observed_at TEXT NOT NULL,
                evidence_sha256 TEXT NOT NULL,
                metric TEXT NOT NULL,
                quantity TEXT NOT NULL,
                unit TEXT NOT NULL,
                interval_start TEXT NOT NULL,
                interval_end TEXT NOT NULL,
                quality TEXT NOT NULL CHECK(quality IN ('measured','estimated')),
                site TEXT NOT NULL,
                PRIMARY KEY(source_id,measurement_id)
            );
            CREATE INDEX IF NOT EXISTS idx_source_events_observed
                ON source_events(source_id,record_id,observed_at);
            CREATE INDEX IF NOT EXISTS idx_bills_due
                ON bill_documents(state,due_date,source_id);
            CREATE INDEX IF NOT EXISTS idx_statements_period
                ON account_statements(period_end,source_id);
            CREATE INDEX IF NOT EXISTS idx_business_posting
                ON business_documents(document_state,posting_date,source_id);
            CREATE INDEX IF NOT EXISTS idx_resources_interval
                ON resource_measurements(interval_start,interval_end,source_id);
            """
        for statement in ddl.split(";"):
            if statement.strip():
                db.execute(statement)
        row = db.execute("SELECT version FROM schema_meta").fetchone()
        if row is None:
            db.execute("INSERT INTO schema_meta(version) VALUES (?)", (SCHEMA_VERSION,))
        elif row["version"] == 1:
            db.execute("ALTER TABLE transactions ADD COLUMN economic_type TEXT")
            db.execute("ALTER TABLE transactions ADD COLUMN category TEXT")
            if not any(column["name"] == "posting_status" for column in db.execute("PRAGMA table_info(transactions)")):
                db.execute("ALTER TABLE transactions ADD COLUMN posting_status TEXT NOT NULL DEFAULT 'posted'")
            db.execute("UPDATE schema_meta SET version=?", (SCHEMA_VERSION,))
        elif row["version"] in (2, 3, 4, 5, 6, 7, 8, 9, 10, 11):
            if not any(column["name"] == "posting_status" for column in db.execute("PRAGMA table_info(transactions)")):
                db.execute("ALTER TABLE transactions ADD COLUMN posting_status TEXT NOT NULL DEFAULT 'posted'")
            db.execute("UPDATE schema_meta SET version=?", (SCHEMA_VERSION,))
        elif row["version"] != SCHEMA_VERSION:
            raise InputError("Unsupported finance database schema version")
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_date_status "
            "ON transactions(posted_date,posting_status,review_status)"
        )


def existing_import(db: sqlite3.Connection, kind: str, digest: str) -> bool:
    return db.execute(
        "SELECT 1 FROM imports WHERE kind=? AND sha256=?", (kind, digest)
    ).fetchone() is not None


def import_budget(db: sqlite3.Connection, path: str) -> dict:
    file, digest = source_file(path)
    if file.suffix.lower() != ".xlsx":
        raise InputError("Budget source must be an .xlsx workbook")
    kind = "budget"
    if existing_import(db, kind, digest):
        return {"status": "already_imported", "rows": 0}
    try:
        with zipfile.ZipFile(file) as archive:
            entries = archive.infolist()
            if len(entries) > 500 or sum(entry.file_size for entry in entries) > 100 * 1024 * 1024:
                raise InputError("Workbook expands beyond supported size")
        workbook = load_workbook(file, read_only=True, data_only=False)
    except InputError:
        raise
    except Exception as exc:
        raise InputError("Could not read workbook") from exc
    try:
        if "Budget Plan" in workbook.sheetnames:
            sheet = workbook["Budget Plan"]
            headers = [sheet.cell(4, n).value for n in range(1, 8)]
            if headers != ["Year", "Month", "Type", "Category", "Line Item", "Planned Amount", "Notes"]:
                raise InputError("Workbook columns differ from the inspected Budget Plan layout")
            if sheet.max_row > 5_000:
                raise InputError("Budget Plan exceeds 5,000 rows")
            rows = []
            for row_number, values in enumerate(sheet.iter_rows(min_row=5, max_col=7, values_only=True), 5):
                if all(value is None for value in values):
                    continue
                year, month, plan_type, category, item, amount, notes = values
                if not isinstance(year, int) or isinstance(year, bool) or not 2000 <= year <= 2100:
                    raise InputError(f"Invalid year on row {row_number}")
                if not isinstance(month, int) or isinstance(month, bool) or not 1 <= month <= 12:
                    raise InputError(f"Invalid month on row {row_number}")
                if plan_type not in ("Income", "Expense"):
                    raise InputError(f"Invalid plan type on row {row_number}")
                if not isinstance(category, str) or not category.strip() or not isinstance(item, str) or not item.strip():
                    raise InputError(f"Missing category or item on row {row_number}")
                if amount is None or amount == "":
                    raise InputError(f"Missing planned amount on row {row_number}")
                rows.append((row_number, year, month, plan_type, category.strip(), item.strip(),
                             cents(amount, allow_negative=False), str(notes)[:1000] if notes is not None else None))
            if not rows:
                raise InputError("No Budget Plan line items found")
            with db:
                cursor = db.execute(
                    "INSERT INTO imports(kind,sha256,source_name,row_count) VALUES (?,?,?,?)",
                    (kind, digest, file.name, len(rows)),
                )
                db.executemany(
                    "INSERT INTO budget_period_lines(import_id,source_row,plan_year,plan_month,plan_type,category,item,planned_cents,notes) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    [(cursor.lastrowid, *row) for row in rows],
                )
            return {"status": "imported", "rows": len(rows), "unbudgeted": 0, "format": "period_plan"}
        if "Household Budget" not in workbook.sheetnames:
            raise InputError("Expected Budget Plan or Household Budget worksheet")
        sheet = workbook["Household Budget"]
        headers = [sheet.cell(4, n).value for n in range(1, 6)]
        if headers[:4] != ["Category", "Line Item", "Monthly $", "Annual $"]:
            raise InputError("Workbook columns differ from the inspected budget layout")
        if sheet.max_row > 5_000:
            raise InputError("Budget worksheet exceeds 5,000 rows")
        rows = []
        current_category = ""
        for row_number in range(5, sheet.max_row + 1):
            category, item, monthly, annual, notes = (
                sheet.cell(row_number, n).value for n in range(1, 6)
            )
            if isinstance(category, str) and category.strip():
                if not category.startswith(("Subtotal", "GRAND TOTAL", "Healthcare", "Homestead Plan", "Projected")):
                    current_category = category.strip()
            if not isinstance(item, str) or not item.strip():
                continue
            if not current_category:
                raise InputError(f"Missing category on row {row_number}")
            if monthly is None or monthly == "":
                month_cents = None
                year_cents = None
            elif isinstance(monthly, str) and monthly.startswith("="):
                raise InputError(f"Unexpected monthly formula on row {row_number}")
            else:
                month_cents = cents(monthly, allow_negative=False)
                year_cents = month_cents * 12
            if annual is not None and not (
                isinstance(annual, str) and annual.startswith("=")
            ):
                raise InputError(f"Expected annual formula on row {row_number}")
            rows.append(
                (row_number, current_category, item.strip(), month_cents, year_cents,
                 PLAN_TYPES.get(current_category, "expense_plan"),
                 str(notes)[:1000] if notes is not None else None)
            )
        if not rows:
            raise InputError("No budget line items found")
        with db:
            cursor = db.execute(
                "INSERT INTO imports(kind,sha256,source_name,row_count) VALUES (?,?,?,?)",
                (kind, digest, file.name, len(rows)),
            )
            db.executemany(
                "INSERT INTO budget_lines(import_id,source_row,category,item,monthly_cents,annual_cents,plan_type,notes) "
                "VALUES (?,?,?,?,?,?,?,?)",
                [(cursor.lastrowid, *row) for row in rows],
            )
        return {"status": "imported", "rows": len(rows), "unbudgeted": sum(row[3] is None for row in rows)}
    finally:
        workbook.close()


def import_transactions(
    db: sqlite3.Connection, path: str, account: str, date_column: str,
    description_column: str, amount_column: str | None,
    debit_column: str | None, credit_column: str | None,
) -> dict:
    if not account.strip() or len(account) > 100:
        raise InputError("Account label is required (up to 100 characters)")
    if bool(amount_column) == bool(debit_column or credit_column):
        raise InputError("Specify amount column or both debit and credit columns")
    if not amount_column and not (debit_column and credit_column):
        raise InputError("Both debit and credit columns are required")
    file, digest = source_file(path)
    kind = "transactions:" + account.strip()
    if existing_import(db, kind, digest):
        return {"status": "already_imported", "rows": 0}
    rows = []
    try:
        with file.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            required = [date_column, description_column]
            required += [amount_column] if amount_column else [debit_column, credit_column]
            if not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)):
                raise InputError("CSV headers are missing or duplicated")
            if any(name not in reader.fieldnames for name in required):
                raise InputError("CSV is missing a selected column")
            for row_number, row in enumerate(reader, start=2):
                if row_number > MAX_ROWS + 1:
                    raise InputError("CSV exceeds 100,000 data rows")
                if None in row or not row[date_column] or not row[description_column]:
                    raise InputError(f"Incomplete transaction on row {row_number}")
                when = iso_date(row[date_column])
                description = row[description_column].strip()
                if not description or len(description) > 500:
                    raise InputError(f"Invalid description on row {row_number}")
                if amount_column:
                    amount = cents(row[amount_column])
                else:
                    debit = cents(row[debit_column]) if row[debit_column] else 0
                    credit = cents(row[credit_column]) if row[credit_column] else 0
                    if debit < 0 or credit < 0 or (debit and credit):
                        raise InputError(f"Invalid debit/credit on row {row_number}")
                    amount = credit - debit
                if amount == 0:
                    raise InputError(f"Zero transaction on row {row_number}")
                rows.append((row_number, account.strip(), when, description, amount))
    except UnicodeError as exc:
        raise InputError("CSV must be UTF-8 encoded") from exc
    if not rows:
        raise InputError("CSV has no transaction rows")
    with db:
        cursor = db.execute(
            "INSERT INTO imports(kind,sha256,source_name,row_count) VALUES (?,?,?,?)",
            (kind, digest, file.name, len(rows)),
        )
        db.executemany(
            "INSERT INTO transactions(import_id,source_row,account,posted_date,description,amount_cents) "
            "VALUES (?,?,?,?,?,?)",
            [(cursor.lastrowid, *row) for row in rows],
        )
    return {"status": "imported", "rows": len(rows), "review_status": "unreviewed"}


def reconcile(db: sqlite3.Connection, account: str, start: str, end: str,
              opening: str, closing: str) -> dict:
    begin, finish = iso_date(start), iso_date(end)
    if date.fromisoformat(begin) > date.fromisoformat(finish):
        raise InputError("Statement start is after end")
    rows = db.execute(
        "SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents),0) AS total "
        "FROM transactions WHERE account=? AND posting_status='posted' "
        "AND posted_date>=? AND posted_date<=?",
        (account, begin, finish),
    ).fetchone()
    open_cents, close_cents = cents(opening), cents(closing)
    calculated = open_cents + rows["total"]
    return {
        "account": account, "period": [begin, finish], "transaction_count": rows["n"],
        "opening_cents": open_cents, "posted_movement_cents": rows["total"],
        "calculated_closing_cents": calculated, "statement_closing_cents": close_cents,
        "difference_cents": close_cents - calculated,
        "status": "balanced_preliminary" if rows["n"] and calculated == close_cents else "needs_review",
    }


ECONOMIC_TYPES = {
    "expense", "income", "transfer", "debt_principal", "interest", "refund"
}


def review_transaction(
    db: sqlite3.Connection, import_id: int, source_row: int,
    economic_type: str, category: str,
) -> dict:
    if economic_type not in ECONOMIC_TYPES:
        raise InputError("Unknown economic type")
    category = category.strip()
    if not category or len(category) > 100:
        raise InputError("Category is required (up to 100 characters)")
    with db:
        row = db.execute(
            "SELECT amount_cents,posting_status FROM transactions WHERE import_id=? AND source_row=?",
            (import_id, source_row),
        ).fetchone()
        if row is None:
            raise InputError("Transaction source row not found")
        if row["posting_status"] != "posted":
            raise InputError("Only posted transactions can be reviewed")
        amount = row["amount_cents"]
        if economic_type in {"expense", "debt_principal", "interest"} and amount >= 0:
            raise InputError("Outflow classification requires a negative amount")
        if economic_type in {"income", "refund"} and amount <= 0:
            raise InputError("Inflow classification requires a positive amount")
        old_review = db.execute(
            "SELECT review_status,economic_type,category FROM transactions WHERE import_id=? AND source_row=?",
            (import_id, source_row),
        ).fetchone()
        db.execute(
            "UPDATE transactions SET review_status='reviewed',economic_type=?,category=? "
            "WHERE import_id=? AND source_row=?",
            (economic_type, category, import_id, source_row),
        )
        if old_review["review_status"] != "reviewed" or old_review["economic_type"] != economic_type or old_review["category"] != category:
            db.execute(
                "DELETE FROM bill_payment_links WHERE import_id=? AND source_row=?",
                (import_id, source_row),
            )
    return {"status": "reviewed", "import_id": import_id, "source_row": source_row}


def add_schedule(
    db: sqlite3.Connection, kind: str, name: str, amount: str,
    frequency: str, next_date: str, category: str,
) -> dict:
    if kind not in {"bill", "income"} or frequency not in {"weekly", "monthly", "annual"}:
        raise InputError("Invalid schedule kind or frequency")
    name, category = name.strip(), category.strip()
    if not name or len(name) > 200 or not category or len(category) > 100:
        raise InputError("Valid schedule name and category are required")
    with db:
        cursor = db.execute(
            "INSERT INTO schedules(kind,name,amount_cents,frequency,next_date,category) "
            "VALUES (?,?,?,?,?,?)",
            (kind, name, cents(amount, allow_negative=False), frequency,
             iso_date(next_date), category),
        )
    return {"status": "scheduled", "id": cursor.lastrowid}


def list_schedules(db: sqlite3.Connection) -> list[dict]:
    rows = db.execute(
        "SELECT id,kind,name,amount_cents,frequency,next_date,category,active "
        "FROM schedules ORDER BY active DESC,next_date,kind,name LIMIT 1001"
    ).fetchall()
    if len(rows) > 1000:
        raise InputError("More than 1000 recurring items; a narrower view is required")
    return [dict(row) for row in rows]


def set_schedule_active(db: sqlite3.Connection, schedule_id: int, active: bool) -> dict:
    if isinstance(schedule_id, bool) or not isinstance(schedule_id, int) or schedule_id < 1:
        raise InputError("Schedule ID must be a positive integer")
    if not isinstance(active, bool):
        raise InputError("Schedule active state must be Boolean")
    with db:
        changed = db.execute("UPDATE schedules SET active=? WHERE id=?", (active, schedule_id)).rowcount
        if changed != 1:
            raise InputError("Recurring item not found")
    return {"status": "active" if active else "paused", "id": schedule_id}


def set_limit(db: sqlite3.Connection, category: str, monthly: str) -> dict:
    category = category.strip()
    if not category or len(category) > 100:
        raise InputError("Category is required (up to 100 characters)")
    amount = cents(monthly, allow_negative=False)
    with db:
        db.execute(
            "INSERT INTO spending_limits(category,monthly_cents) VALUES (?,?) "
            "ON CONFLICT(category) DO UPDATE SET monthly_cents=excluded.monthly_cents",
            (category, amount),
        )
    return {"status": "limit_saved", "category": category, "monthly_cents": amount}


GOAL_SCOPES = {"personal", "household", "homestead_business", "kecktech", "datacenter"}


def set_goal(db: sqlite3.Connection, owner_scope: str, name: str,
             target: str, target_date: str) -> dict:
    if owner_scope not in GOAL_SCOPES:
        raise InputError("Unknown goal owner scope")
    name = name.strip()
    if not name or len(name) > 200:
        raise InputError("Goal name is required (up to 200 characters)")
    amount = cents(target, allow_negative=False)
    if amount == 0:
        raise InputError("Goal target must be positive")
    when = iso_date(target_date)
    with db:
        db.execute(
            "INSERT INTO goals(owner_scope,name,target_cents,target_date) VALUES (?,?,?,?) "
            "ON CONFLICT(owner_scope,name) DO UPDATE SET "
            "target_cents=excluded.target_cents,target_date=excluded.target_date",
            (owner_scope, name, amount, when),
        )
    return {"status": "goal_saved", "owner_scope": owner_scope, "name": name}


def list_goals(db: sqlite3.Connection) -> list[dict]:
    return [dict(row) for row in db.execute(
        "SELECT owner_scope,name,target_cents,target_date FROM goals "
        "ORDER BY target_date,owner_scope,name"
    )]


def monthly_summary(db: sqlite3.Connection, month: str, owner_scope: str | None = None) -> dict:
    try:
        begin = date.fromisoformat(month + "-01")
    except ValueError as exc:
        raise InputError("Month must be YYYY-MM") from exc
    if begin.isoformat()[:7] != month:
        raise InputError("Month must be YYYY-MM")
    end = date(begin.year + (begin.month == 12), begin.month % 12 + 1, 1)
    if owner_scope is not None and owner_scope not in GOAL_SCOPES:
        raise InputError("Unknown owner scope")
    scope_filter = " AND s.owner_scope=?" if owner_scope else ""
    params = [begin.isoformat(), end.isoformat()]
    if owner_scope:
        params.append(owner_scope)
    rows = db.execute(
        "SELECT t.economic_type,t.category,t.amount_cents,t.review_status,t.posting_status "
        "FROM transactions t LEFT JOIN feed_transaction_map m "
        "ON m.import_id=t.import_id AND m.source_row=t.source_row "
        "LEFT JOIN connection_sources s ON s.source_id=m.source_id "
        "WHERE t.posted_date>=? AND t.posted_date<?" + scope_filter,
        params,
    ).fetchall()
    totals = {kind: 0 for kind in ECONOMIC_TYPES}
    unreviewed = 0
    pending = 0
    removed = 0
    posted = 0
    category_expense: dict[str, int] = {}
    for row in rows:
        if row["posting_status"] == "pending":
            pending += 1
            continue
        if row["posting_status"] == "removed":
            removed += 1
            continue
        posted += 1
        if row["review_status"] != "reviewed":
            unreviewed += 1
            continue
        kind = row["economic_type"]
        if kind not in totals:
            raise InputError("Reviewed transaction has an invalid economic type")
        totals[kind] += row["amount_cents"]
        if kind in {"expense", "interest"}:
            category_expense[row["category"]] = (
                category_expense.get(row["category"], 0) - row["amount_cents"]
            )
    limits = [
        {
            "category": row["category"],
            "limit_cents": row["monthly_cents"],
            "reviewed_spending_cents": category_expense.get(row["category"], 0),
            "remaining_cents": row["monthly_cents"] - category_expense.get(row["category"], 0),
        }
        for row in db.execute("SELECT category,monthly_cents FROM spending_limits ORDER BY category")
    ] if owner_scope in (None, "household") else []
    plan = db.execute(
        "SELECT plan_type,COALESCE(SUM(planned_cents),0) AS total FROM budget_period_lines "
        "WHERE import_id=(SELECT MAX(id) FROM imports WHERE kind='budget') "
        "AND plan_year=? AND plan_month=? GROUP BY plan_type",
        (begin.year, begin.month),
    ).fetchall()
    planned = {row["plan_type"]: row["total"] for row in plan} if owner_scope in (None, "household") else {}
    return {
        "month": month, "imported_rows": posted, "unreviewed_rows": unreviewed,
        "pending_rows": pending, "removed_rows": removed,
        "planned_income_cents": planned.get("Income"),
        "planned_expense_cents": planned.get("Expense"),
        "reviewed_income_cents": totals["income"],
        "reviewed_expense_cents": -totals["expense"],
        "reviewed_interest_cents": -totals["interest"],
        "reviewed_debt_principal_cents": -totals["debt_principal"],
        "reviewed_refunds_cents": totals["refund"],
        "transfer_net_cents": totals["transfer"],
        "spending_limits": limits,
        "completeness": (
            "no_transactions" if not rows else
            "no_posted_transactions" if not posted else
            "review_required" if unreviewed else "reviewed_rows_only"
        ),
    }


def list_transactions(db: sqlite3.Connection, account: str | None, month: str | None,
                      owner_scope: str | None = None) -> dict:
    filters = []
    params: list[str] = []
    if account:
        filters.append("t.account=?")
        params.append(account)
    if month:
        try:
            begin = date.fromisoformat(month + "-01")
        except ValueError as exc:
            raise InputError("Month must be YYYY-MM") from exc
        if begin.isoformat()[:7] != month:
            raise InputError("Month must be YYYY-MM")
        end = date(begin.year + (begin.month == 12), begin.month % 12 + 1, 1)
        filters.extend(["t.posted_date>=?", "t.posted_date<?"])
        params.extend([begin.isoformat(), end.isoformat()])
    if owner_scope is not None:
        if owner_scope not in GOAL_SCOPES:
            raise InputError("Unknown owner scope")
        filters.append("s.owner_scope=?")
        params.append(owner_scope)
    where = " WHERE " + " AND ".join(filters) if filters else ""
    rows = db.execute(
        "SELECT t.import_id,t.source_row,t.account,t.posted_date,t.description,t.amount_cents,"
        "t.review_status,t.economic_type,t.category,t.posting_status,s.owner_scope FROM transactions t "
        "LEFT JOIN feed_transaction_map m ON m.import_id=t.import_id AND m.source_row=t.source_row "
        "LEFT JOIN connection_sources s ON s.source_id=m.source_id" + where +
        " ORDER BY t.posted_date,t.import_id,t.source_row LIMIT 1001",
        params,
    ).fetchall()
    if len(rows) > 1000:
        raise InputError("More than 1,000 rows; filter by account or month")
    return {"transactions": [dict(row) for row in rows], "count": len(rows)}


def status(db: sqlite3.Connection) -> dict:
    budget = db.execute(
        "SELECT COUNT(*) AS n, SUM(monthly_cents IS NULL) AS unknown, "
        "COALESCE(SUM(monthly_cents),0) AS total FROM budget_lines "
        "WHERE import_id=(SELECT MAX(id) FROM imports WHERE kind='budget')"
    ).fetchone()
    transactions = db.execute("SELECT COUNT(*) AS n FROM transactions").fetchone()
    posting_counts = {
        row["posting_status"]: row["n"] for row in db.execute(
            "SELECT posting_status,COUNT(*) AS n FROM transactions GROUP BY posting_status"
        )
    }
    unreviewed = db.execute(
        "SELECT COUNT(*) AS n FROM transactions "
        "WHERE review_status='unreviewed' AND posting_status='posted'"
    ).fetchone()
    schedules = db.execute(
        "SELECT kind,COUNT(*) AS n FROM schedules WHERE active=1 GROUP BY kind"
    ).fetchall()
    period_budget = db.execute(
        "SELECT COUNT(*) AS n FROM budget_period_lines "
        "WHERE import_id=(SELECT MAX(id) FROM imports WHERE kind='budget')"
    ).fetchone()
    return {
        "budget_imported": bool(budget["n"] or period_budget["n"]),
        "budget_lines": budget["n"] + period_budget["n"], "budget_unbudgeted": budget["unknown"] or 0,
        "planned_monthly_cents_including_debt_payments": budget["total"] if budget["n"] else None,
        "transaction_rows": transactions["n"],
        "posted_transaction_rows": posting_counts.get("posted", 0),
        "pending_transaction_rows": posting_counts.get("pending", 0),
        "removed_transaction_rows": posting_counts.get("removed", 0),
        "transaction_rows_unreviewed": unreviewed["n"],
        "active_schedules": {row["kind"]: row["n"] for row in schedules},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline finance import and reconciliation")
    parser.add_argument("--db", required=True, help="Private SQLite path outside repository")
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("init")
    b = subs.add_parser("import-budget")
    b.add_argument("--file", required=True)
    t = subs.add_parser("import-transactions")
    t.add_argument("--file", required=True)
    t.add_argument("--account", required=True)
    t.add_argument("--date-column", required=True)
    t.add_argument("--description-column", required=True)
    t.add_argument("--amount-column")
    t.add_argument("--debit-column")
    t.add_argument("--credit-column")
    r = subs.add_parser("reconcile")
    for arg in ("account", "start", "end", "opening", "closing"):
        r.add_argument("--" + arg, required=True)
    subs.add_parser("status")
    review = subs.add_parser("review-transaction")
    review.add_argument("--import-id", type=int, required=True)
    review.add_argument("--row", type=int, required=True)
    review.add_argument("--type", required=True, choices=sorted(ECONOMIC_TYPES))
    review.add_argument("--category", required=True)
    schedule = subs.add_parser("add-schedule")
    schedule.add_argument("--kind", required=True, choices=["bill", "income"])
    schedule.add_argument("--name", required=True)
    schedule.add_argument("--amount", required=True)
    schedule.add_argument("--frequency", required=True, choices=["weekly", "monthly", "annual"])
    schedule.add_argument("--next-date", required=True)
    schedule.add_argument("--category", required=True)
    limit = subs.add_parser("set-limit")
    limit.add_argument("--category", required=True)
    limit.add_argument("--monthly", required=True)
    monthly = subs.add_parser("monthly-summary")
    monthly.add_argument("--month", required=True)
    listing = subs.add_parser("list-transactions")
    listing.add_argument("--account")
    listing.add_argument("--month")
    transfer = subs.add_parser("transfer-candidates")
    transfer.add_argument("--max-days", type=int, default=3)
    args = parser.parse_args(argv)
    try:
        db = open_db(args.db)
        try:
            init_db(db)
            if args.command == "init":
                result = {"status": "initialized"}
            elif args.command == "import-budget":
                result = import_budget(db, args.file)
            elif args.command == "import-transactions":
                result = import_transactions(
                    db, args.file, args.account, args.date_column,
                    args.description_column, args.amount_column,
                    args.debit_column, args.credit_column,
                )
            elif args.command == "reconcile":
                result = reconcile(db, args.account, args.start, args.end,
                                   args.opening, args.closing)
            elif args.command == "review-transaction":
                result = review_transaction(
                    db, args.import_id, args.row, args.type, args.category
                )
            elif args.command == "add-schedule":
                result = add_schedule(
                    db, args.kind, args.name, args.amount, args.frequency,
                    args.next_date, args.category,
                )
            elif args.command == "set-limit":
                result = set_limit(db, args.category, args.monthly)
            elif args.command == "monthly-summary":
                result = monthly_summary(db, args.month)
            elif args.command == "list-transactions":
                result = list_transactions(db, args.account, args.month)
            elif args.command == "transfer-candidates":
                from .matching import transfer_candidates
                result = {"candidates": transfer_candidates(db, args.max_days)}
            else:
                result = status(db)
            print(json.dumps(result, indent=2))
            return 0
        finally:
            db.close()
    except (InputError, OSError, sqlite3.Error) as exc:
        print(f"Finance core error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
