import sqlite3
import unittest

from finance_core.connections import register_source
from finance_core.core import InputError, init_db
from finance_core.marketlist import ingest_pantry_snapshot, pantry_view


class MarketlistSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "marketlist-home", "household", "marketlist", 24)
        self.base = dict(source_id="marketlist-home", household_id="home1", revision="1",
                         payload_sha256="a" * 64, observed_at="2026-09-14T12:00:00Z",
                         items=[{"id": "eggs", "name": "Eggs", "quantity": 12,
                                 "unit": "each", "category": "Dairy", "expiryDate": "2026-09-20"}])

    def tearDown(self):
        self.db.close()

    def test_complete_snapshot_replaces_items_and_empty_is_distinct_from_missing(self):
        self.assertEqual(pantry_view(self.db)["snapshots"], [])
        self.assertEqual(ingest_pantry_snapshot(self.db, **self.base)["status"], "recorded")
        self.assertEqual(ingest_pantry_snapshot(self.db, **self.base)["status"], "duplicate")
        self.assertEqual(pantry_view(self.db)["items"][0]["quantity"], "12")
        updated = dict(self.base, revision="2", payload_sha256="b" * 64,
                       observed_at="2026-09-15T12:00:00Z", items=[])
        ingest_pantry_snapshot(self.db, **updated)
        self.assertEqual(pantry_view(self.db)["items"], [])
        self.assertEqual(len(pantry_view(self.db)["snapshots"]), 1)
        with self.assertRaises(InputError):
            ingest_pantry_snapshot(self.db, **dict(self.base, revision="3"))

    def test_invalid_snapshot_is_atomic_and_household_bound(self):
        with self.assertRaises(InputError):
            ingest_pantry_snapshot(self.db, **dict(self.base, items=[dict(self.base["items"][0], quantity=-1)]))
        self.assertEqual(pantry_view(self.db)["snapshots"], [])
        ingest_pantry_snapshot(self.db, **self.base)
        with self.assertRaises(InputError):
            ingest_pantry_snapshot(self.db, **dict(self.base, household_id="other", revision="2",
                                                   payload_sha256="b" * 64,
                                                   observed_at="2026-09-15T12:00:00Z"))
        self.assertEqual(len(pantry_view(self.db)["snapshots"]), 1)


if __name__ == "__main__":
    unittest.main()
