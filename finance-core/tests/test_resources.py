import sqlite3
import unittest

from finance_core.connections import register_source
from finance_core.core import InputError, init_db
from finance_core.resources import ingest_resource_measurement, resource_month_view


class ResourceMeasurementTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "solar", "household", "utility_meter", 1)
        self.base = dict(source_id="solar", measurement_id="interval-1", revision="1",
                         payload_sha256="a" * 64, observed_at="2026-09-15T12:00:00Z",
                         metric="solar_generation", quantity="12.345", unit="kWh",
                         interval_start="2026-09-14T00:00:00-05:00",
                         interval_end="2026-09-15T00:00:00-05:00", quality="measured", site="Home")

    def tearDown(self):
        self.db.close()

    def test_revision_aggregation_and_no_financial_value(self):
        self.assertEqual(ingest_resource_measurement(self.db, **self.base)["status"], "recorded")
        self.assertEqual(ingest_resource_measurement(self.db, **self.base)["status"], "duplicate")
        view = resource_month_view(self.db, "2026-09")
        self.assertEqual(view["totals"][0]["quantity"], "12.345")
        self.assertIsNone(view["financial_value"])
        corrected = dict(self.base, revision="2", payload_sha256="b" * 64,
                         observed_at="2026-09-16T12:00:00Z", quantity="13.000")
        ingest_resource_measurement(self.db, **corrected)
        self.assertEqual(resource_month_view(self.db, "2026-09")["totals"][0]["quantity"], "13.000")

    def test_invalid_units_ranges_and_sources_are_atomic(self):
        for changed in (dict(quantity="-1"), dict(unit="dollars"),
                        dict(interval_end="2026-09-14T00:00:00-05:00")):
            with self.assertRaises(InputError):
                ingest_resource_measurement(self.db, **dict(self.base, **changed))
        register_source(self.db, "biller", "household", "biller", 24)
        with self.assertRaises(InputError):
            ingest_resource_measurement(self.db, **dict(self.base, source_id="biller"))
        self.assertEqual(resource_month_view(self.db, "2026-09")["measurements"], [])

    def test_boundary_spanning_interval_is_visible_but_not_summed(self):
        ingest_resource_measurement(
            self.db, **dict(self.base, interval_start="2026-08-31T23:00:00Z",
                            interval_end="2026-09-01T01:00:00Z")
        )
        view = resource_month_view(self.db, "2026-09")
        self.assertEqual(len(view["measurements"]), 1)
        self.assertEqual(view["boundary_spanning"], 1)
        self.assertEqual(view["totals"], [])


if __name__ == "__main__":
    unittest.main()
