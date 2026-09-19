import sqlite3
import unittest

from finance_core.connections import record_source_event, register_source
from finance_core.core import InputError, init_db, monthly_summary, reconcile, review_transaction
from finance_core.feed import ingest_account_event


class AccountFeedTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        init_db(self.db)
        register_source(self.db, "checking-1", "household", "bank", 24)

    def tearDown(self):
        self.db.close()

    def event(self, revision, status, observed_at, digest=None, **changes):
        values = dict(
            source_id="checking-1", record_id="provider-txn-1", revision=revision,
            payload_sha256=digest or revision[0] * 64, observed_at=observed_at,
            posting_status=status,
        )
        if status != "removed":
            values.update(posted_date="2026-09-14", description="Market", amount="-25.00")
        values.update(changes)
        return ingest_account_event(self.db, **values)

    def test_pending_posted_modified_removed_lifecycle(self):
        self.assertEqual(self.event("a1", "pending", "2026-09-14T10:00:00Z")["status"], "recorded")
        self.assertEqual(monthly_summary(self.db, "2026-09")["pending_rows"], 1)
        self.assertEqual(monthly_summary(self.db, "2026-09")["imported_rows"], 0)
        with self.assertRaises(InputError):
            review_transaction(self.db, 1, 1, "expense", "Food")
        self.assertEqual(self.event("b1", "posted", "2026-09-15T10:00:00Z")["status"], "updated")
        self.assertEqual(monthly_summary(self.db, "2026-09")["unreviewed_rows"], 1)
        review_transaction(self.db, 1, 1, "expense", "Food")
        self.assertEqual(monthly_summary(self.db, "2026-09")["reviewed_expense_cents"], 2500)
        self.assertEqual(self.event("c1", "posted", "2026-09-16T10:00:00Z", amount="-27.00")["review_reset"], True)
        self.assertEqual(monthly_summary(self.db, "2026-09")["reviewed_expense_cents"], 0)
        self.assertEqual(monthly_summary(self.db, "2026-09")["unreviewed_rows"], 1)
        self.assertEqual(reconcile(self.db, "checking-1", "2026-09-01", "2026-09-30", "100.00", "73.00")["status"],
                         "balanced_preliminary")
        self.assertEqual(self.event("d1", "removed", "2026-09-17T10:00:00Z")["status"], "updated")
        summary = monthly_summary(self.db, "2026-09")
        self.assertEqual(summary["removed_rows"], 1)
        self.assertEqual(summary["imported_rows"], 0)
        self.assertEqual(reconcile(self.db, "checking-1", "2026-09-01", "2026-09-30", "100.00", "100.00")["status"],
                         "needs_review")

    def test_duplicate_conflict_and_out_of_order_do_not_mutate_current_record(self):
        first = self.event("a1", "posted", "2026-09-14T10:00:00Z")
        self.assertEqual(first["status"], "recorded")
        self.assertEqual(self.event("a1", "posted", "2026-09-14T10:00:00Z")["status"], "duplicate")
        with self.assertRaises(InputError):
            self.event("a1", "posted", "2026-09-14T10:00:00Z", digest="f" * 64)
        with self.assertRaises(InputError):
            self.event("b1", "posted", "2026-09-14T09:00:00Z")
        with self.assertRaises(InputError):
            self.event("c1", "posted", "2026-09-14T10:00:00Z")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_events").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0], 1)

    def test_unknown_source_and_removed_first_are_rejected_atomically(self):
        with self.assertRaises(InputError):
            self.event("a1", "removed", "2026-09-14T10:00:00Z")
        with self.assertRaises(InputError):
            ingest_account_event(
                self.db, source_id="missing", record_id="x", revision="1",
                payload_sha256="a" * 64, observed_at="2026-09-14T10:00:00Z",
                posting_status="posted", posted_date="2026-09-14",
                description="Item", amount="-10.00",
            )
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_events").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0], 0)

    def test_preexisting_event_without_transaction_is_not_silent_duplicate(self):
        record_source_event(self.db, "checking-1", "provider-txn-1", "a1", "a" * 64,
                            "2026-09-14T10:00:00Z")
        with self.assertRaises(InputError):
            self.event("a1", "posted", "2026-09-14T10:00:00Z")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
