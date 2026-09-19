"""Build/test an allowlisted release candidate without touching Nexus's worktree."""
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path('F:/Github/nexus/apps/assistant-api')
STAGE=ROOT/'.recovery-private/nexus-preparation'
NODE=Path('C:/Users/jonkd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def sources():
    return {str(p.relative_to(SOURCE)).replace('\\','/'):sha(p) for p in sorted(SOURCE.joinpath('src').rglob('*.ts'))} | {n:sha(SOURCE/n) for n in ['package.json','tsconfig.json']}
before=sources()
STAGE.mkdir(parents=True,exist_ok=True)
(STAGE/'package.json').write_text('{"name":"nexus-assistant-release","private":true,"type":"module"}\n')
subprocess.run([str(NODE),'F:/Github/nexus/node_modules/typescript/bin/tsc','-p',str(SOURCE/'tsconfig.json'),'--outDir',str(STAGE/'dist')],check=True)
subprocess.run([str(NODE),'--test',*[str(p) for p in sorted((STAGE/'dist/test').glob('*.test.js'))]],check=True)
assert sources()==before, 'Concurrent source change detected; rebuild required'
deployment=ROOT/'ops/recovery/nexus-deployment'
entries={f'dist/{p.name}':p for p in (STAGE/'dist').glob('*.js')}
entries['package.json']=STAGE/'package.json'
entries.update({f'deployment/{p.name}':p for p in deployment.iterdir() if p.is_file()})
identity=hashlib.sha256(json.dumps({n:sha(p) for n,p in sorted(entries.items())},sort_keys=True).encode()).hexdigest()
archive=STAGE/f'nexus-assistant-{identity[:16]}.tar.gz'
with tarfile.open(archive,'w:gz') as tar:
    for name,p in sorted(entries.items()): tar.add(p,arcname=name,recursive=False)
manifest={'at':datetime.now(timezone.utc).isoformat(),'status':'REVIEW CANDIDATE — NOT DEPLOYABLE UNTIL READINESS GAPS CLOSE','source':before,'artifactIdentity':identity,'archive':str(archive),'archiveSha256':sha(archive),'files':{n:sha(p) for n,p in sorted(entries.items())},'runtime':'Node 24.19.0 Linux (not installed on VM125)','testFiles':[p.name for p in sorted((STAGE/'dist/test').glob('*.test.js'))],'excluded':['.env','credentials','state','node_modules','unrelated Nexus apps','tests'],'concurrentSourceChange':False}
(ROOT/'ops/recovery/nexus-package-manifest-2026-09-16.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'archive':str(archive),'sha256':sha(archive),'files':len(entries)}))
