import sqlite3
import unittest

from finance_core.app import dollars
from finance_core.connections import register_source
from finance_core.core import init_db
from finance_core.viewmodel import connection_view, month_view


class ViewModelTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)

    def tearDown(self):
        self.db.close()

    def test_empty_view_never_displays_zero_as_actual(self):
        view = month_view(self.db, "2026-09")
        self.assertEqual(view["actual_state"], "No transaction data")
        self.assertIsNone(view["summary"]["planned_income_cents"])
        self.assertEqual(view["plan_rows"], [])
        self.assertEqual(dollars(None), "Not available")
        self.assertEqual(dollars(-123456), "−$1,234.56")

    def test_plan_rows_are_scoped_to_selected_month_and_latest_import(self):
        with self.db:
            self.db.execute(
                "INSERT INTO imports(id,kind,sha256,source_name,row_count) VALUES (1,'budget',?,'old.xlsx',1)",
                ("a" * 64,),
            )
            self.db.execute(
                "INSERT INTO imports(id,kind,sha256,source_name,row_count) VALUES (2,'budget',?,'new.xlsx',2)",
                ("b" * 64,),
            )
            self.db.execute(
                "INSERT INTO budget_period_lines VALUES (1,5,2026,9,'Expense','Food','Old',9999,NULL)"
            )
            self.db.execute(
                "INSERT INTO budget_period_lines VALUES (2,5,2026,9,'Expense','Food','Groceries',45000,NULL)"
            )
            self.db.execute(
                "INSERT INTO budget_period_lines VALUES (2,6,2026,10,'Expense','Food','October',50000,NULL)"
            )
        view = month_view(self.db, "2026-09")
        self.assertEqual([r["item"] for r in view["plan_rows"]], ["Groceries"])
        self.assertEqual(view["summary"]["planned_expense_cents"], 45000)
        self.assertEqual(dollars(45000), "$450.00")

    def test_registered_source_is_never_synced(self):
        register_source(self.db, "checking-a", "household", "bank", 24)
        rows = connection_view(self.db, "2026-09-14T10:00:00Z")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["state"], "never_synced")


if __name__ == "__main__":
    unittest.main()
