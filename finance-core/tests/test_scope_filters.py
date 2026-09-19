import sqlite3
import unittest

from finance_core.bills import ingest_bill_event
from finance_core.connections import register_source
from finance_core.core import init_db, list_transactions, monthly_summary, review_transaction
from finance_core.feed import ingest_account_event
from finance_core.viewmodel import bill_view, connection_view


class ScopeFilterTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)

    def tearDown(self):
        self.db.close()

    def test_personal_and_household_actuals_do_not_mix(self):
        for source, scope, amount in (("personal-bank", "personal", "-10.00"),
                                      ("home-bank", "household", "-20.00")):
            register_source(self.db, source, scope, "bank", 24)
            ingest_account_event(
                self.db, source_id=source, record_id="tx", revision="1",
                payload_sha256=("a" if scope == "personal" else "b") * 64,
                observed_at="2026-09-15T12:00:00Z", posting_status="posted",
                posted_date="2026-09-14", description="Expense", amount=amount,
            )
            row = self.db.execute(
                "SELECT import_id,source_row FROM feed_transaction_map WHERE source_id=?", (source,)
            ).fetchone()
            review_transaction(self.db, row["import_id"], row["source_row"], "expense", "Other")
        self.assertEqual(monthly_summary(self.db, "2026-09", "personal")["reviewed_expense_cents"], 1000)
        self.assertEqual(monthly_summary(self.db, "2026-09", "household")["reviewed_expense_cents"], 2000)
        self.assertEqual(len(list_transactions(self.db, None, "2026-09", "personal")["transactions"]), 1)
        self.assertEqual(len(connection_view(self.db, "2026-09-15T13:00:00Z", "household")), 1)

    def test_bill_filter_uses_source_owner(self):
        for source, scope in (("personal-bill", "personal"), ("home-bill", "household")):
            register_source(self.db, source, scope, "biller", 24)
            ingest_bill_event(
                self.db, source_id=source, bill_id="sept", revision="1",
                payload_sha256=("c" if scope == "personal" else "d") * 64,
                observed_at="2026-09-15T12:00:00Z", state="received", description="Bill",
                amount_due="30.00", issued_date="2026-09-01", due_date="2026-09-20",
            )
        self.assertEqual(bill_view(self.db, "personal")[0]["source_id"], "personal-bill")
        self.assertEqual(len(bill_view(self.db)), 2)


if __name__ == "__main__":
    unittest.main()
