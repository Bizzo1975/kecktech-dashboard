import sqlite3
import unittest

from finance_core.bills import ingest_bill_event
from finance_core.connections import register_source
from finance_core.core import InputError, init_db, monthly_summary
from finance_core.viewmodel import bill_view


class BillLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "power", "household", "biller", 24)
        self.base = dict(source_id="power", bill_id="sept", revision="1",
                         payload_sha256="a" * 64, observed_at="2026-09-14T12:00:00Z",
                         state="received", description="Electric service", amount_due="100.00",
                         issued_date="2026-09-01", due_date="2026-09-20",
                         service_start="2026-08-01", service_end="2026-08-31")

    def tearDown(self):
        self.db.close()

    def test_revision_and_actuals_separate(self):
        self.assertEqual(ingest_bill_event(self.db, **self.base)["status"], "recorded")
        self.assertEqual(ingest_bill_event(self.db, **self.base)["status"], "duplicate")
        self.assertEqual(bill_view(self.db)[0]["amount_due_cents"], 10000)
        self.assertEqual(monthly_summary(self.db, "2026-09")["imported_rows"], 0)
        update = dict(self.base, revision="2", payload_sha256="b" * 64,
                      observed_at="2026-09-15T12:00:00Z", amount_due="110.00")
        self.assertEqual(ingest_bill_event(self.db, **update)["status"], "updated")
        self.assertEqual(bill_view(self.db)[0]["amount_due_cents"], 11000)
        with self.assertRaises(InputError):
            ingest_bill_event(self.db, **dict(self.base, revision="3", observed_at="2026-09-14T12:00:00Z"))
        void = dict(source_id="power", bill_id="sept", revision="3", payload_sha256="c" * 64,
                    observed_at="2026-09-16T12:00:00Z", state="voided")
        ingest_bill_event(self.db, **void)
        self.assertEqual(bill_view(self.db), [])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_events").fetchone()[0], 3)

    def test_validation_and_source_boundary(self):
        with self.assertRaises(InputError):
            ingest_bill_event(self.db, **dict(self.base, service_end="2026-07-31"))
        with self.assertRaises(InputError):
            ingest_bill_event(self.db, **dict(self.base, due_date="2026-08-20"))
        register_source(self.db, "checking", "household", "bank", 24)
        with self.assertRaises(InputError):
            ingest_bill_event(self.db, **dict(self.base, source_id="checking"))
        self.assertEqual(bill_view(self.db), [])


if __name__ == "__main__":
    unittest.main()
