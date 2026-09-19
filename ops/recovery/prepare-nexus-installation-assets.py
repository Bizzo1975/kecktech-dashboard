"""Prepare bounded document snapshots and a release approval manifest only."""
from pathlib import Path
import hashlib,json,re,tarfile
from datetime import datetime,timezone

root=Path(__file__).resolve().parents[2]
stage=root/'.recovery-private/nexus-preparation'
entries={}
for name in ('kecktech-dashboard','kecktech-infrastructure'):
    repo=Path('F:/Github')/name
    for relative in ('README.md','PROJECT_INSTRUCTIONS.md','AGENTS.md','inventory/README.md'):
        p=repo/relative
        if p.is_file():
            content=p.read_text(encoding='utf-8-sig')
            if re.search(r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}|sk-ant-[A-Za-z0-9_-]{20,}',content):
                raise RuntimeError(f'Secret-like content requires review: {name}/{relative}')
            entries[f'{name}/{relative}']=p
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hashes={n:sha(p) for n,p in sorted(entries.items())}
identity=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()
archive=stage/f'nexus-repository-documents-{identity[:16]}.tar.gz'
with tarfile.open(archive,'w:gz') as tar:
    for name,p in sorted(entries.items()):tar.add(p,arcname=name,recursive=False)
assert hashes=={n:sha(p) for n,p in sorted(entries.items())}, 'Concurrent snapshot edit'
release=json.loads((root/'ops/recovery/nexus-package-manifest-2026-09-16.json').read_text())
for name,digest in release['source'].items():
    assert sha(Path('F:/Github/nexus/apps/assistant-api')/name)==digest, f'Concurrent source edit: {name}'
assert sha(Path(release['archive']))==release['archiveSha256']
runtime=stage/'node-v24.19.0-linux-x64.tar.xz'
assert sha(runtime)=='14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647'
manifest={'at':datetime.now(timezone.utc).isoformat(),'status':'PREPARED — INSTALLATION REQUIRES APPROVAL','host':'VM125 / 10.20.0.125','release':{'path':release['archive'],'sha256':release['archiveSha256'],'identity':release['artifactIdentity']},'runtime':{'path':str(runtime),'sha256':sha(runtime),'source':'https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz','version':'24.19.0'},'repositoryDocuments':{'path':str(archive),'sha256':sha(archive),'identity':identity,'files':hashes,'scope':'Bounded current documentation snapshots, not complete repositories or deployed source'},'cleanBuildLockSha256':sha(root/'.recovery-private/nexus-clean-build/package-lock.json'),'tests':{'linuxUnitTests':26,'concurrentHttpRecordsAfterRestart':8,'linuxOutputMatchesPackage':True},'configuration':{'sovereignUrl':'http://10.20.0.122:8200','litUrl':'http://10.20.0.115:8202','listen':'127.0.0.1:8787','writeKeys':'OMIT','modelKeys':'OMIT','cloudAllowed':False,'credentials':'Reuse existing operator token and domain READ keys from operator-owned local configuration; values excluded'}}
(root/'ops/recovery/nexus-installation-manifest-2026-09-17.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'snapshotFiles':len(entries),'snapshotIdentity':identity,'manifest':'ops/recovery/nexus-installation-manifest-2026-09-17.json'}))
