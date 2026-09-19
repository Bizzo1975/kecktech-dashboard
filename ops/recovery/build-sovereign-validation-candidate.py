"""Prepare narrow SQL repair for review without altering the Sovereign checkout."""
from pathlib import Path
import hashlib
import difflib

source = Path('F:/Github/sovereign-standalone/daily/alert_evaluator_light.py')
expected = '62f6acc549e615f052db0dfa294c35a7ec5ea482fd6fd55053ac40bde1bd53aa'
raw = source.read_bytes()
assert hashlib.sha256(raw).hexdigest() == expected, 'Source changed; reconcile first'
before = raw.decode().replace('\r\n', '\n')
old = 'WHERE ran_at >= NOW() - make_interval(days => $days)'
assert before.count(old) == 1
after = before.replace(old, 'WHERE ts >= NOW() - make_interval(days => $1)')
root = Path(__file__).resolve().parent
(root / 'sovereign-validation-query.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/daily/alert_evaluator_light.py', tofile='b/daily/alert_evaluator_light.py')), encoding='utf-8')
stage = root.parents[1] / '.recovery-private' / 'sovereign-validation'
stage.mkdir(parents=True, exist_ok=True)
(stage / 'alert_evaluator_light.py').write_text(after, encoding='utf-8')
print('Prepared one-line SQL patch; source checkout unchanged')
