import sqlite3
import tempfile
import unittest
from pathlib import Path

from finance_core.core import backup_database, database_health, init_db, open_db, set_limit


class BackupTests(unittest.TestCase):
    def test_backup_is_readable_and_complete(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source.db"
            destination = Path(folder) / "backup.db"
            db = open_db(str(source))
            try:
                init_db(db)
                set_limit(db, "Food", "500.00")
                self.assertEqual(database_health(db)["status"], "ok")
                self.assertEqual(backup_database(db, str(destination))["status"], "backed_up")
            finally:
                db.close()
            copy = sqlite3.connect(destination)
            try:
                self.assertEqual(copy.execute(
                    "SELECT monthly_cents FROM spending_limits WHERE category='Food'"
                ).fetchone()[0], 50000)
                self.assertEqual(copy.execute("PRAGMA quick_check").fetchone()[0], "ok")
            finally:
                copy.close()


if __name__ == "__main__":
    unittest.main()
