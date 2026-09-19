import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path

from finance_core.core import InputError, import_transactions, init_db
from finance_core.matching import transfer_candidates


class TransferCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def add(self, account, rows):
        path = Path(self.temp.name) / f"{account}.csv"
        with path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(("Date", "Description", "Amount"))
            writer.writerows(rows)
        import_transactions(self.db, str(path), account, "Date", "Description", "Amount", None, None)

    def test_unique_cross_account_candidate_is_not_classified(self):
        self.add("checking", [("2026-09-01", "Card payment", "-150.00")])
        self.add("credit-card", [("2026-09-03", "Payment received", "150.00")])
        matches = transfer_candidates(self.db)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["status"], "candidate_only")
        self.assertEqual(matches[0]["amount_cents"], 15000)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactions WHERE review_status='reviewed'").fetchone()[0], 0)

    def test_ambiguous_and_distant_items_are_not_suggested(self):
        self.add("checking", [("2026-09-01", "Transfer", "-100.00")])
        self.add("savings", [("2026-09-02", "Deposit", "100.00")])
        self.add("other-account", [("2026-09-02", "Deposit", "100.00")])
        self.assertEqual(transfer_candidates(self.db), [])
        self.assertEqual(transfer_candidates(self.db, 0), [])
        with self.assertRaises(InputError):
            transfer_candidates(self.db, 30)


if __name__ == "__main__":
    unittest.main()
