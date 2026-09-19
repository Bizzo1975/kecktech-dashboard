"""Isolated candidate regression; no graph access, notifications, or evaluator runs."""
import json
import unittest
from datetime import datetime, timezone
from neo4j.time import Date, DateTime, Time


class AlertJsonTests(unittest.TestCase):
    def test_original_failure(self):
        with self.assertRaises(TypeError):
            json.dumps({"alerts": [{"created_at": DateTime(2026, 9, 16)}]})

    def test_nested_timestamp_keeps_nanoseconds_and_offset(self):
        value = DateTime(2026, 9, 16, 12, 30, 1, 123456789, tzinfo=timezone.utc)
        payload = {"alerts": [{"created_at": value}], "count": 1, "error": None}
        parsed = json.loads(json.dumps(payload, default=alert_json_default))
        self.assertEqual(parsed["alerts"][0]["created_at"], "2026-09-16T12:30:01.123456789+00:00")
        self.assertEqual(parsed["count"], 1)
        self.assertIsNone(parsed["error"])

    def test_supported_temporal_values(self):
        for value in (Date(2026, 9, 16), Time(12, 30), datetime(2026, 9, 16, tzinfo=timezone.utc)):
            expected = value.iso_format() if hasattr(value, "iso_format") else value.isoformat()
            self.assertEqual(json.loads(json.dumps(value, default=alert_json_default)), expected)

    def test_unknown_values_still_fail(self):
        with self.assertRaises(TypeError):
            json.dumps({"unexpected": object()}, default=alert_json_default)


if __name__ == "__main__":
    unittest.main()
