import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from finance_core.core import (
    InputError, add_schedule, cents, import_budget, import_transactions, init_db,
    iso_date, list_goals, list_transactions, monthly_summary, reconcile,
    review_transaction, set_goal, set_limit, status,
)


class FinanceCoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def workbook(self, *, valid=True):
        book = Workbook()
        sheet = book.active
        sheet.title = "Household Budget"
        sheet.append(["Annual Expense Summary"])
        sheet.append(["Instructions"])
        sheet.append([])
        sheet.append(["Category", "Line Item", "Monthly $" if valid else "Monthly", "Annual $", "Notes / Source"])
        sheet.append(["Food"])
        sheet.append(["Food", "Groceries", 100, "=C6*12", "receipt needed"])
        sheet.append(["Food", "Dining", None, '=IF(C7="","",C7*12)'])
        sheet.append(["Subtotal - Food", None, "=SUM(C6:C7)", "=SUM(D6:D7)"])
        sheet.append(["Debt Payments (Non-Mortgage)"])
        sheet.append(["Debt Payments (Non-Mortgage)", "Card payment", 50, "=C10*12"])
        path = self.root / "plan.xlsx"
        book.save(path)
        book.close()
        return str(path)

    def transactions(self, rows, columns=("Date", "Description", "Amount")):
        path = self.root / "statement.csv"
        with path.open("w", encoding="utf-8", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(columns)
            writer.writerows(rows)
        return str(path)

    def test_budget_import_preserves_unknown_and_debt_plan(self):
        path = self.workbook()
        self.assertEqual(import_budget(self.db, path), {"status": "imported", "rows": 3, "unbudgeted": 1})
        self.assertEqual(import_budget(self.db, path), {"status": "already_imported", "rows": 0})
        self.assertEqual(status(self.db)["planned_monthly_cents_including_debt_payments"], 15000)
        lines = self.db.execute("SELECT item,monthly_cents,plan_type FROM budget_lines ORDER BY source_row").fetchall()
        self.assertIsNone(lines[1]["monthly_cents"])
        self.assertEqual(lines[2]["plan_type"], "debt_payment_plan")

    def test_budget_rejects_changed_layout_without_partial_import(self):
        with self.assertRaises(InputError):
            import_budget(self.db, self.workbook(valid=False))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM imports").fetchone()[0], 0)

    def test_period_plan_import_keeps_income_and_expense_separate(self):
        book = Workbook()
        sheet = book.active
        sheet.title = "Budget Plan"
        sheet.append(["Plan"])
        sheet.append([])
        sheet.append([])
        sheet.append(["Year", "Month", "Type", "Category", "Line Item", "Planned Amount", "Notes"])
        sheet.append([2026, 9, "Income", "Work", "Pay", 2000, None])
        sheet.append([2026, 9, "Expense", "Food", "Groceries", 400, None])
        path = self.root / "period.xlsx"
        book.save(path)
        book.close()
        self.assertEqual(import_budget(self.db, str(path))["rows"], 2)
        summary = monthly_summary(self.db, "2026-09")
        self.assertEqual(summary["planned_income_cents"], 200000)
        self.assertEqual(summary["planned_expense_cents"], 40000)
        self.assertEqual(summary["completeness"], "no_transactions")

    def test_csv_import_and_reconciliation(self):
        path = self.transactions([
            ("08/01/2026", "Payroll", "1000.00"),
            ("08/02/2026", "Groceries", "-100.00"),
            ("08/03/2026", "Transfer", "-200.00"),
        ])
        result = import_transactions(self.db, path, "checking", "Date", "Description", "Amount", None, None)
        self.assertEqual(result["rows"], 3)
        self.assertEqual(import_transactions(self.db, path, "checking", "Date", "Description", "Amount", None, None)["status"], "already_imported")
        balance = reconcile(self.db, "checking", "2026-08-01", "2026-08-31", "500.00", "1200.00")
        self.assertEqual(balance["difference_cents"], 0)
        self.assertEqual(balance["status"], "balanced_preliminary")
        self.assertEqual(reconcile(self.db, "checking", "2026-08-01", "2026-08-31", "500.00", "1201.00")["status"], "needs_review")

    def test_debit_credit_import_and_invalid_row_rolls_back(self):
        path = self.transactions(
            [("2026-08-01", "Fuel", "25.00", ""), ("2026-08-02", "Refund", "", "5.00")],
            ("Date", "Description", "Debit", "Credit"),
        )
        import_transactions(self.db, path, "card", "Date", "Description", None, "Debit", "Credit")
        amounts = [r[0] for r in self.db.execute("SELECT amount_cents FROM transactions ORDER BY source_row")]
        self.assertEqual(amounts, [-2500, 500])
        bad = self.transactions([("2026-08-01", "Fuel", "25.00", "5.00")], ("Date", "Description", "Debit", "Credit"))
        with self.assertRaises(InputError):
            import_transactions(self.db, bad, "card", "Date", "Description", None, "Debit", "Credit")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0], 2)

    def test_invalid_dates_and_money(self):
        for value in ("2026-02-30", "13/01/2026", ""):
            with self.assertRaises(InputError):
                iso_date(value)
        for value in ("NaN", "1.001", "", True):
            with self.assertRaises(InputError):
                cents(value)

    def test_reconcile_empty_period_never_reports_balanced(self):
        result = reconcile(self.db, "checking", "2026-08-01", "2026-08-31", "10.00", "10.00")
        self.assertEqual(result["difference_cents"], 0)
        self.assertEqual(result["status"], "needs_review")

    def test_review_separates_purchase_from_card_payment_and_limit(self):
        path = self.transactions([
            ("2026-08-01", "Market", "-80.00"),
            ("2026-08-02", "Card payment", "-200.00"),
            ("2026-08-03", "Salary", "500.00"),
        ])
        import_transactions(self.db, path, "checking", "Date", "Description", "Amount", None, None)
        set_limit(self.db, "Food", "100.00")
        early = monthly_summary(self.db, "2026-08")
        self.assertEqual(early["unreviewed_rows"], 3)
        self.assertEqual(early["reviewed_expense_cents"], 0)
        review_transaction(self.db, 1, 2, "expense", "Food")
        review_transaction(self.db, 1, 3, "transfer", "Card payment")
        review_transaction(self.db, 1, 4, "income", "Salary")
        self.assertEqual(list_transactions(self.db, "checking", "2026-08")["count"], 3)
        result = monthly_summary(self.db, "2026-08")
        self.assertEqual(result["reviewed_expense_cents"], 8000)
        self.assertEqual(result["reviewed_income_cents"], 50000)
        self.assertEqual(result["transfer_net_cents"], -20000)
        self.assertEqual(result["spending_limits"][0]["remaining_cents"], 2000)
        self.assertEqual(result["unreviewed_rows"], 0)

    def test_invalid_review_and_schedules_leave_no_changes(self):
        path = self.transactions([("2026-08-01", "Salary", "500.00")])
        import_transactions(self.db, path, "checking", "Date", "Description", "Amount", None, None)
        with self.assertRaises(InputError):
            review_transaction(self.db, 1, 2, "expense", "Food")
        self.assertEqual(status(self.db)["transaction_rows_unreviewed"], 1)
        with self.assertRaises(InputError):
            add_schedule(self.db, "bill", "Power", "-10.00", "monthly", "2026-08-20", "Utilities")
        self.assertEqual(status(self.db)["active_schedules"], {})
        add_schedule(self.db, "bill", "Power", "75.00", "monthly", "2026-08-20", "Utilities")
        add_schedule(self.db, "income", "Salary", "500.00", "weekly", "2026-08-21", "Income")
        self.assertEqual(status(self.db)["active_schedules"], {"bill": 1, "income": 1})

    def test_goal_target_is_plan_without_fabricated_progress(self):
        set_goal(self.db, "household", "Emergency fund", "2500.00", "2027-09-01")
        set_goal(self.db, "household", "Emergency fund", "3000.00", "2027-09-01")
        goals = list_goals(self.db)
        self.assertEqual(len(goals), 1)
        self.assertEqual(goals[0]["target_cents"], 300000)
        self.assertNotIn("current_cents", goals[0])
        for target, when in (("0", "2027-09-01"), ("10.001", "2027-09-01"),
                             ("100", "2027-02-30")):
            with self.assertRaises(InputError):
                set_goal(self.db, "household", "Bad goal", target, when)
        self.assertEqual(len(list_goals(self.db)), 1)


if __name__ == "__main__":
    unittest.main()
