import sqlite3
import unittest

from finance_core.bills import ingest_bill_event
from finance_core.connections import register_source
from finance_core.core import InputError, init_db, review_transaction
from finance_core.feed import ingest_account_event
from finance_core.payments import link_bill_payment, unlink_bill_payment
from finance_core.viewmodel import bill_view


class BillPaymentTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "power", "household", "biller", 24)
        register_source(self.db, "bank", "household", "bank", 24)
        ingest_bill_event(
            self.db, source_id="power", bill_id="sept", revision="1", payload_sha256="a" * 64,
            observed_at="2026-09-10T12:00:00Z", state="received", description="Power",
            amount_due="100.00", issued_date="2026-09-01", due_date="2026-09-20",
        )
        ingest_account_event(
            self.db, source_id="bank", record_id="debit1", revision="1", payload_sha256="b" * 64,
            observed_at="2026-09-12T12:00:00Z", posting_status="posted",
            posted_date="2026-09-12", description="Power payment", amount="-80.00",
        )
        row = self.db.execute("SELECT import_id,source_row FROM feed_transaction_map").fetchone()
        self.tx = (row["import_id"], row["source_row"])

    def tearDown(self):
        self.db.close()

    def link(self, amount):
        return link_bill_payment(self.db, bill_source_id="power", bill_id="sept",
                                 import_id=self.tx[0], source_row=self.tx[1], amount=amount)

    def test_review_allocation_and_invalidation(self):
        with self.assertRaises(InputError):
            self.link("50.00")
        review_transaction(self.db, *self.tx, "expense", "Utilities")
        self.assertEqual(self.link("50.00")["status"], "linked")
        self.assertEqual(self.link("50.00")["status"], "duplicate")
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 5000)
        review_transaction(self.db, *self.tx, "expense", "Utilities")
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 5000)
        with self.assertRaises(InputError):
            self.link("75.00")
        ingest_account_event(
            self.db, source_id="bank", record_id="debit1", revision="2", payload_sha256="c" * 64,
            observed_at="2026-09-13T12:00:00Z", posting_status="posted",
            posted_date="2026-09-12", description="Corrected power payment", amount="-80.00",
        )
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 0)
        with self.assertRaises(InputError):
            self.link("50.00")
        review_transaction(self.db, *self.tx, "expense", "Utilities")
        self.link("50.00")
        ingest_bill_event(
            self.db, source_id="power", bill_id="sept", revision="2", payload_sha256="d" * 64,
            observed_at="2026-09-14T12:00:00Z", state="received", description="Power corrected",
            amount_due="90.00", issued_date="2026-09-01", due_date="2026-09-20",
        )
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 0)

    def test_overpayment_and_unlink(self):
        review_transaction(self.db, *self.tx, "expense", "Utilities")
        with self.assertRaises(InputError):
            self.link("100.00")
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 0)
        self.link("80.00")
        self.assertEqual(unlink_bill_payment(self.db, bill_source_id="power", bill_id="sept",
                                             import_id=self.tx[0], source_row=self.tx[1])["status"], "unlinked")
        self.assertEqual(bill_view(self.db)[0]["linked_cents"], 0)


if __name__ == "__main__":
    unittest.main()
