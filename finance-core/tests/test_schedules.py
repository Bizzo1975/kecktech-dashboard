import sqlite3
import unittest

from finance_core.core import InputError, add_schedule, init_db, list_schedules, set_schedule_active


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)

    def tearDown(self):
        self.db.close()

    def test_add_pause_and_resume_without_deletion(self):
        created = add_schedule(self.db, "income", "Paycheck", "1000.00", "weekly",
                               "2026-09-18", "Employment")
        self.assertEqual(list_schedules(self.db)[0]["active"], 1)
        self.assertEqual(set_schedule_active(self.db, created["id"], False)["status"], "paused")
        self.assertEqual(list_schedules(self.db)[0]["active"], 0)
        self.assertEqual(set_schedule_active(self.db, created["id"], True)["status"], "active")
        self.assertEqual(len(list_schedules(self.db)), 1)

    def test_unknown_schedule_does_not_change_data(self):
        with self.assertRaises(InputError):
            set_schedule_active(self.db, 99, False)
        self.assertEqual(list_schedules(self.db), [])


if __name__ == "__main__":
    unittest.main()
