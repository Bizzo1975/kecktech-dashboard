import sqlite3
import unittest

from finance_core.connections import register_source
from finance_core.core import InputError, init_db
from finance_core.feed import ingest_account_event
from finance_core.statements import ingest_account_statement, statement_check


class AccountStatementTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "checking", "household", "bank", 24)
        self.statement = dict(
            source_id="checking", statement_id="2026-09", revision="1",
            payload_sha256="a" * 64, observed_at="2026-10-01T12:00:00Z",
            period_start="2026-09-01", period_end="2026-09-30",
            opening_balance="1000.00", closing_balance="900.00",
        )

    def tearDown(self):
        self.db.close()

    def test_snapshot_replay_correction_and_arithmetic(self):
        self.assertEqual(ingest_account_statement(self.db, **self.statement)["status"], "recorded")
        self.assertEqual(ingest_account_statement(self.db, **self.statement)["status"], "duplicate")
        self.assertEqual(statement_check(self.db, "checking", "2026-09")["status"], "no_posted_rows_unverified")
        ingest_account_event(
            self.db, source_id="checking", record_id="debit", revision="1",
            payload_sha256="b" * 64, observed_at="2026-09-15T12:00:00Z",
            posting_status="posted", posted_date="2026-09-15", description="Power",
            amount="-100.00",
        )
        check = statement_check(self.db, "checking", "2026-09")
        self.assertEqual(check["difference_cents"], 0)
        self.assertEqual(check["status"], "arithmetic_matches_preliminary")
        self.assertEqual(check["unreviewed_rows"], 1)
        corrected = dict(self.statement, revision="2", payload_sha256="c" * 64,
                         observed_at="2026-10-02T12:00:00Z", closing_balance="850.00")
        ingest_account_statement(self.db, **corrected)
        self.assertEqual(statement_check(self.db, "checking", "2026-09")["difference_cents"], -5000)
        with self.assertRaises(InputError):
            ingest_account_statement(self.db, **dict(corrected, revision="3", observed_at="2026-10-01T12:00:00Z"))

    def test_invalid_scope_currency_and_period_do_not_write(self):
        register_source(self.db, "mail", "household", "mailbox", 24)
        for changed in (
            dict(source_id="mail"), dict(currency_code="EUR"),
            dict(period_end="2026-08-31"),
        ):
            with self.assertRaises(InputError):
                ingest_account_statement(self.db, **dict(self.statement, **changed))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM account_statements").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
