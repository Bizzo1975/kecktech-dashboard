"""Read-only, sanitized scheduled-run acceptance capture on VM122."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

result = {'at': datetime.now(timezone.utc).isoformat(), 'evaluators': []}
for name, report in [('light', 'alert_evaluation_light.json'), ('nightly', 'alert_evaluation.json')]:
    unit = f'sovereign-alert-eval-{name}.service'
    raw = subprocess.check_output(['systemctl', 'show', unit, '-p', 'ActiveState', '-p', 'ExecMainStatus', '-p', 'ExecMainExitTimestamp'], text=True)
    record = {'name': name, 'unit': dict(line.split('=', 1) for line in raw.splitlines() if '=' in line)}
    path = Path('/opt/sovereign/data') / report
    record['defaultReportPath'] = str(path)
    record['reportExists'] = path.exists()
    if path.exists():
        try:
            data = json.loads(path.read_text())
            record['generatedAt'] = data.get('generated_at')
            record['evaluator'] = data.get('evaluator')
            record['reportKeys'] = sorted(data)
            record['errorFieldPaths'] = []
            def inspect(value, trail=''):
                if isinstance(value, dict):
                    for key, child in value.items():
                        if key in ('error', 'errors') and child:
                            record['errorFieldPaths'].append(trail + '.' + key)
                        inspect(child, trail + '.' + key)
                elif isinstance(value, list):
                    for child in value:
                        inspect(child, trail + '[]')
            inspect(data)
            record['parseable'] = True
        except (ValueError, OSError) as exc:
            record['parseable'] = False
            record['errorClass'] = type(exc).__name__
    result['evaluators'].append(record)
print(json.dumps(result))
