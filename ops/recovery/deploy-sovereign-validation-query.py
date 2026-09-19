"""Approved VM122 one-line repair; abort on source drift or active evaluator."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
from datetime import datetime, timezone

target=Path('/opt/sovereign/daily/alert_evaluator_light.py')
expected='62f6acc549e615f052db0dfa294c35a7ec5ea482fd6fd55053ac40bde1bd53aa'
digest=lambda data:hashlib.sha256(data).hexdigest()
for name in ('light','nightly'):
    state=subprocess.check_output(['systemctl','show',f'sovereign-alert-eval-{name}.service','-p','ActiveState','--value'],text=True).strip()
    if state not in ('inactive','failed'):raise RuntimeError('Evaluator busy; retry after scheduled run')
assert target.resolve()==target and not target.is_symlink()
before=target.read_bytes()
assert digest(before)==expected, 'Source changed; reconcile first'
old=b'WHERE ran_at >= NOW() - make_interval(days => $days)'
assert before.count(old)==1
after=before.replace(old,b'WHERE ts >= NOW() - make_interval(days => $1)')
compile(after,str(target),'exec')
meta=target.stat()
backup=Path('/var/backups/kecktech-recovery')/('sovereign-validation-query-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
backup.mkdir(mode=0o700,parents=True,exist_ok=False)
os.chmod(backup,0o700)
saved=backup/target.name
shutil.copy2(target,saved)
os.chown(saved,meta.st_uid,meta.st_gid)
assert digest(saved.read_bytes())==expected
manifest={'at':datetime.now(timezone.utc).isoformat(),'target':str(target),'backup':str(backup),'before':expected,'after':digest(after),'uid':meta.st_uid,'gid':meta.st_gid,'mode':stat.S_IMODE(meta.st_mode)}
(backup/'manifest.json').write_text(json.dumps(manifest,indent=2))
os.chmod(backup/'manifest.json',0o600)
temporary=target.with_name(target.name+'.sql-repair-new')
with temporary.open('xb') as stream:
    stream.write(after);stream.flush();os.fsync(stream.fileno())
os.chown(temporary,meta.st_uid,meta.st_gid)
os.chmod(temporary,stat.S_IMODE(meta.st_mode))
assert digest(target.read_bytes())==expected, 'Concurrent source change before replacement'
os.replace(temporary,target)
assert digest(target.read_bytes())==manifest['after']
manifest['result']='DEPLOYED_HASH_VERIFIED'
print(json.dumps(manifest))
