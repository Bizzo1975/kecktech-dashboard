"""VM122-only approved three-file repair. Bundle arrives as JSON on stdin."""
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path('/opt/sovereign')
EXPECTED = {
    'daily/alert_evaluator.py': '3cabc2a69bde536cf4f659dec2772b5cd45d1c9262ae93ae6eeb1106539c291e',
    'daily/alert_evaluator_light.py': '731b1b0c9693cbb8ebfda975cbf5bcda78fe974653dc23cddc8f36c85eeb7e56',
}
HELPER = 'app/alert_report_serialization.py'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main(bundle):
    assert set(bundle) == set(EXPECTED) | {HELPER}
    files = {name: base64.b64decode(value, validate=True) for name, value in bundle.items()}
    for name, data in files.items():
        assert (ROOT / name).parent.resolve().is_relative_to(ROOT)
        compile(data, name, 'exec')
    for unit in ('sovereign-alert-eval-light.service', 'sovereign-alert-eval-nightly.service'):
        state = subprocess.check_output(['systemctl', 'show', unit, '-p', 'ActiveState', '--value'], text=True).strip()
        if state not in ('inactive', 'failed'):
            raise RuntimeError(f'Evaluator busy: {unit} {state}')
    assert not (ROOT / HELPER).exists(), 'Helper already exists; reconcile first'
    metadata = {}
    for name, expected in EXPECTED.items():
        path = ROOT / name
        assert not path.is_symlink()
        assert digest(path.read_bytes()) == expected, f'Baseline changed: {name}'
        metadata[name] = path.stat()
    backup = Path('/var/backups/kecktech-recovery') / ('sovereign-alert-json-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.mkdir(mode=0o700, parents=True, exist_ok=False)
    os.chmod(backup, 0o700)
    manifest = {'timestamp': datetime.now(timezone.utc).isoformat(), 'backup': str(backup), 'before': EXPECTED, 'after': {n: digest(d) for n, d in files.items()}, 'metadata': {n: {'uid': s.st_uid, 'gid': s.st_gid, 'mode': stat.S_IMODE(s.st_mode)} for n, s in metadata.items()}}
    for name, expected in EXPECTED.items():
        saved = backup / Path(name).name
        shutil.copy2(ROOT / name, saved)
        os.chown(saved, metadata[name].st_uid, metadata[name].st_gid)
        assert digest(saved.read_bytes()) == expected
    (backup / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    os.chmod(backup / 'manifest.json', 0o600)
    changed = []
    try:
        for name in [HELPER, *EXPECTED]:
            target = ROOT / name
            if name in EXPECTED:
                assert digest(target.read_bytes()) == EXPECTED[name]
            temporary = target.with_name(target.name + '.repair-new')
            with temporary.open('xb') as handle:
                handle.write(files[name])
                handle.flush()
                os.fsync(handle.fileno())
            original = metadata.get(name, metadata['daily/alert_evaluator.py'])
            os.chown(temporary, original.st_uid, original.st_gid)
            os.chmod(temporary, stat.S_IMODE(original.st_mode) if name in EXPECTED else 0o644)
            os.replace(temporary, target)
            changed.append(name)
            assert digest(target.read_bytes()) == manifest['after'][name]
        manifest['result'] = 'DEPLOYED_HASH_VERIFIED'
    except Exception:
        for name in reversed(changed):
            target = ROOT / name
            assert digest(target.read_bytes()) == manifest['after'][name], 'Concurrent change; manual reconciliation required'
            if name == HELPER:
                target.unlink()
            else:
                shutil.copy2(backup / Path(name).name, target)
                os.chown(target, metadata[name].st_uid, metadata[name].st_gid)
                assert digest(target.read_bytes()) == EXPECTED[name]
        raise
    print(json.dumps(manifest))

if __name__ == '__main__':
    main(json.load(sys.stdin))
