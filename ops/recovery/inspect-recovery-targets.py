"""Read-only allowlisted metadata for recovery planning; no config/env/log values."""
import datetime
import json
import subprocess

def run(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=30, check=True).stdout

names = run(['docker','ps','-a','--format','{{.Names}}']).splitlines()
rows = []
for name in names:
    if not (name.startswith(('erpnext-', 'umami', 'farmbot-')) or name == '4af0d3b9-0b29-4c2c-ab38-7fb191a1dbca'):
        continue
    v = json.loads(run(['docker','inspect',name]))[0]
    labels = v['Config'].get('Labels') or {}
    rows.append({'name': name, 'id': v['Id'], 'imageId': v['Image'],
                 'state': v['State']['Status'],
                 'mounts': [{k: m.get(k) for k in ('Type','Name','Source','Destination','RW')} for m in v['Mounts']],
                 'networks': list(v['NetworkSettings']['Networks']),
                 'composeFiles': labels.get('com.docker.compose.project.config_files'),
                 'composeDirectory': labels.get('com.docker.compose.project.working_dir'),
                 'restartPolicy': v['HostConfig']['RestartPolicy']['Name']})
print(json.dumps({'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'containers': rows, 'filesystemCapacity': run(['df','-Pk','/','/var/lib/docker'])}))
