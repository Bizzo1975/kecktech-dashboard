"""Generate a review patch only; never modify the Sovereign checkout."""
from pathlib import Path
import difflib
import hashlib

HERE = Path(__file__).resolve().parent
SOURCE = Path("F:/Github/sovereign-standalone")
BASELINES = {
    "daily/alert_evaluator.py": "3cabc2a69bde536cf4f659dec2772b5cd45d1c9262ae93ae6eeb1106539c291e",
    "daily/alert_evaluator_light.py": "731b1b0c9693cbb8ebfda975cbf5bcda78fe974653dc23cddc8f36c85eeb7e56",
}
patch = []
for name, expected in BASELINES.items():
    raw = (SOURCE / name).read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        raise RuntimeError(f"Source changed; reconcile again: {name}")
    before = raw.decode().replace("\r\n", "\n")
    anchor = 'sys.path.insert(0, str(ROOT / "app"))\n'
    target = "json.dumps(payload, indent=2)"
    assert before.count(anchor) == before.count(target) == 1
    after = before.replace(anchor, anchor + "from alert_report_serialization import alert_json_default\n")
    after = after.replace(target, "json.dumps(payload, indent=2, default=alert_json_default)")
    patch.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile="a/" + name, tofile="b/" + name))
helper = (HERE / "sovereign-alert-json-candidate.py").read_text().replace("Proposed evaluator JSON adapter; not installed in Sovereign.", "JSON timestamp serialization for alert evaluator reports.")
patch.extend(difflib.unified_diff([], helper.splitlines(True), fromfile="/dev/null", tofile="b/app/alert_report_serialization.py"))
(HERE / "sovereign-alert-json.patch").write_text("".join(patch), encoding="utf-8", newline="\n")
print("Review patch generated; Sovereign files unchanged.")
