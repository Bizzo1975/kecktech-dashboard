import sqlite3
import unittest

from finance_core.bills import ingest_bill_event
from finance_core.connections import register_source
from finance_core.core import init_db, set_limit
from finance_core.insights import savings_signals


class SavingsSignalTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "power", "household", "biller", 24)

    def tearDown(self):
        self.db.close()

    def bill(self, bill_id, amount, start, end):
        return ingest_bill_event(
            self.db, source_id="power", bill_id=bill_id, revision="1",
            payload_sha256=("a" if bill_id == "aug" else "b") * 64,
            observed_at="2026-09-14T12:00:00Z", state="received",
            description="Electric service", amount_due=amount,
            issued_date="2026-09-01", due_date="2026-09-20",
            service_start=start, service_end=end,
        )

    def test_bill_increase_is_observed_not_savings(self):
        self.bill("aug", "100.00", "2026-08-01", "2026-08-31")
        self.bill("sep", "120.00", "2026-10-01", "2026-10-31")
        self.assertEqual(savings_signals(self.db, "2026-09"), [])
        self.assertEqual(savings_signals(self.db, "2026-10")[0]["kind"], "bill_increase")
        self.assertIsNone(savings_signals(self.db, "2026-10")[0]["estimated_savings_cents"])

    def test_empty_limit_is_not_overrun(self):
        set_limit(self.db, "Food", "100.00")
        self.assertEqual(savings_signals(self.db, "2026-09"), [])


if __name__ == "__main__":
    unittest.main()
