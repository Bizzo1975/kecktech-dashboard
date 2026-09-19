import sqlite3
import tempfile
import unittest
from pathlib import Path

from finance_core.business import business_year_view, export_business_year, ingest_business_document
from finance_core.connections import register_source
from finance_core.core import InputError, init_db


class BusinessDocumentTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        init_db(self.db)
        register_source(self.db, "erp-kecktech", "kecktech", "erpnext", 24)
        self.base = dict(source_id="erp-kecktech", document_id="PINV-1", revision="1",
                         payload_sha256="a" * 64, observed_at="2026-09-15T12:00:00Z",
                         document_type="purchase_invoice", document_state="submitted",
                         posting_date="2026-09-14", counterparty="Utility Vendor", total="125.00")

    def tearDown(self):
        self.db.close()

    def test_booked_record_and_tax_exceptions(self):
        self.assertEqual(ingest_business_document(self.db, **self.base)["status"], "recorded")
        self.assertEqual(ingest_business_document(self.db, **self.base)["status"], "duplicate")
        view = business_year_view(self.db, 2026)
        self.assertEqual(view["exception_count"], 1)
        self.assertEqual(view["documents"][0]["exception"], "business purpose, tax category")
        corrected = dict(self.base, revision="2", payload_sha256="b" * 64,
                         observed_at="2026-09-16T12:00:00Z",
                         business_purpose="Operate office", tax_category="Utilities")
        ingest_business_document(self.db, **corrected)
        self.assertEqual(business_year_view(self.db, 2026)["exception_count"], 0)
        cancelled = dict(source_id="erp-kecktech", document_id="PINV-1", revision="3",
                         payload_sha256="c" * 64, observed_at="2026-09-17T12:00:00Z",
                         document_type="purchase_invoice", document_state="cancelled", currency_code=None)
        ingest_business_document(self.db, **cancelled)
        self.assertEqual(business_year_view(self.db, 2026)["documents"], [])

    def test_personal_and_non_erp_sources_rejected(self):
        register_source(self.db, "erp-personal", "personal", "erpnext", 24)
        with self.assertRaises(InputError):
            ingest_business_document(self.db, **dict(self.base, source_id="erp-personal"))
        with self.assertRaises(InputError):
            ingest_business_document(self.db, **dict(self.base, document_state="draft"))
        self.assertEqual(business_year_view(self.db, 2026)["documents"], [])

    def test_review_export_preserves_exceptions_and_never_claims_tax_ready(self):
        ingest_business_document(self.db, **self.base)
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "review.csv"
            result = export_business_year(self.db, 2026, str(target))
            self.assertFalse(result["tax_ready"])
            self.assertEqual(result["exception_count"], 1)
            content = target.read_text(encoding="utf-8-sig")
            self.assertIn("business purpose, tax category", content)
            with self.assertRaises(InputError):
                export_business_year(self.db, 2026, str(target))


if __name__ == "__main__":
    unittest.main()
