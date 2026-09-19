import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location("catalog",Path(__file__).with_name("build-runtime-catalog.py"))
catalog=importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)
class CatalogTests(unittest.TestCase):
    def guest(self,output="",state="running"):
        return {"vmid":1,"capturedAt":"2026-09-15T00:00:00Z","powerState":state,"output":output}
    def test_stopped_guest_does_not_become_healthy_or_empty_app_claim(self):
        data=catalog.build({"capturedAt":"now","guests":[self.guest(state="stopped")]})
        self.assertEqual(data["guests"][0]["powerState"],"stopped")
        self.assertEqual(data["runtimes"],[])
        self.assertTrue(data["gaps"])
    def test_failed_native_service_and_timer_are_distinct(self):
        rows=catalog.parse_guest(self.guest("SERVICES\n● legacy.service loaded failed failed Old\nTIMERS\n- - legacy.timer legacy.service"))
        self.assertEqual(len(rows),2)
        self.assertEqual(rows[0]["observedState"],"loaded/failed/failed")
        self.assertEqual(rows[1]["activates"],"legacy.service")
    def test_container_health_is_not_app_acceptance(self):
        rows=catalog.parse_guest(self.guest("DOCKER\napp|image|Up (healthy)|127.0.0.1:80->80/tcp\nLISTENERS\nunrelated|text|must|not parse"))
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["applicationAcceptance"],"not_verified")
    def test_duplicate_runtime_fails(self):
        with self.assertRaises(ValueError):
            catalog.build({"capturedAt":"now","guests":[self.guest("DOCKER\na|i|Up|\na|i|Up|")]})
if __name__=="__main__": unittest.main()

