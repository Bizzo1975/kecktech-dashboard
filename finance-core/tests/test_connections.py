import sqlite3
import unittest

from finance_core.connections import (
    record_source_event, record_sync_result, register_source, source_health,
)
from finance_core.core import InputError, init_db


class ConnectionFoundationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        init_db(self.db)

    def tearDown(self):
        self.db.close()

    def test_source_is_not_live_on_registration_and_becomes_stale(self):
        result = register_source(self.db, "checking-primary", "household", "bank", 24)
        self.assertEqual(result["status"], "registered_not_connected")
        self.assertEqual(source_health(self.db, "checking-primary", "2026-09-14T10:00:00Z")["state"], "never_synced")
        record_sync_result(self.db, "checking-primary", "2026-09-14T10:00:00Z", success=True)
        self.assertEqual(source_health(self.db, "checking-primary", "2026-09-15T09:00:00Z")["state"], "fresh")
        self.assertEqual(source_health(self.db, "checking-primary", "2026-09-15T11:00:00Z")["state"], "stale")
        record_sync_result(self.db, "checking-primary", "2026-09-15T12:00:00Z", success=False,
                           error_code="PROVIDER_TIMEOUT")
        health = source_health(self.db, "checking-primary", "2026-09-15T13:00:00Z")
        self.assertEqual(health["state"], "error")
        self.assertEqual(health["last_success_at"], "2026-09-14T10:00:00Z")
        record_sync_result(self.db, "checking-primary", "2026-09-15T14:00:00Z", success=True)
        self.assertEqual(source_health(self.db, "checking-primary", "2026-09-15T14:00:00Z")["state"], "fresh")

    def test_event_replay_and_conflicting_revision(self):
        register_source(self.db, "card-1", "personal", "credit_card", 12)
        args = (self.db, "card-1", "txn-1", "rev-1", "a" * 64, "2026-09-14T08:00:00-05:00")
        self.assertEqual(record_source_event(*args)["status"], "recorded")
        self.assertEqual(record_source_event(*args)["status"], "duplicate")
        with self.assertRaises(InputError):
            record_source_event(self.db, "card-1", "txn-1", "rev-1", "b" * 64,
                                "2026-09-14T13:00:00Z")
        self.assertEqual(record_source_event(self.db, "card-1", "txn-1", "rev-2", "b" * 64,
                                             "2026-09-14T13:00:00Z")["status"], "recorded")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_events").fetchone()[0], 2)
        self.assertEqual(self.db.execute("SELECT observed_at FROM source_events WHERE revision='rev-1'").fetchone()[0],
                         "2026-09-14T13:00:00Z")

    def test_invalid_source_and_sync_cannot_create_false_health(self):
        with self.assertRaises(InputError):
            register_source(self.db, "unsafe/secret", "household", "bank", 24)
        register_source(self.db, "bank-1", "household", "bank", 24)
        for timestamp, success, code in [
            ("2026-09-14", True, None),
            ("2026-09-14T10:00:00Z", False, "raw error with credentials"),
            ("2026-09-14T10:00:00Z", True, "FAIL"),
        ]:
            with self.assertRaises(InputError):
                record_sync_result(self.db, "bank-1", timestamp, success=success, error_code=code)
        with self.assertRaises(InputError):
            record_source_event(self.db, "missing", "r", "1", "a" * 64, "2026-09-14T10:00:00Z")
        self.assertEqual(source_health(self.db, "bank-1", "2026-09-14T11:00:00Z")["state"], "never_synced")

    def test_schema_three_upgrades_without_losing_rows(self):
        register_source(self.db, "bank-1", "personal", "bank", 24)
        self.db.execute("UPDATE schema_meta SET version=3")
        init_db(self.db)
        self.assertEqual(self.db.execute("SELECT version FROM schema_meta").fetchone()[0], 12)
        self.assertEqual(source_health(self.db, "bank-1", "2026-09-14T10:00:00Z")["state"], "never_synced")


if __name__ == "__main__":
    unittest.main()
