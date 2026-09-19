import sqlite3
import unittest

from finance_core.core import InputError, init_db


class SchemaSafetyTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row

    def tearDown(self):
        self.db.close()

    def test_unknown_version_rejected_before_new_tables(self):
        self.db.execute("CREATE TABLE schema_meta(version INTEGER NOT NULL)")
        self.db.execute("INSERT INTO schema_meta VALUES (999)")
        with self.assertRaises(InputError):
            init_db(self.db)
        self.assertIsNone(self.db.execute(
            "SELECT name FROM sqlite_master WHERE name='bill_payment_links'"
        ).fetchone())

    def test_unmarked_database_rejected_before_new_tables(self):
        self.db.execute("CREATE TABLE unrelated(id INTEGER)")
        with self.assertRaises(InputError):
            init_db(self.db)
        self.assertIsNone(self.db.execute(
            "SELECT name FROM sqlite_master WHERE name='schema_meta'"
        ).fetchone())


if __name__ == "__main__":
    unittest.main()
