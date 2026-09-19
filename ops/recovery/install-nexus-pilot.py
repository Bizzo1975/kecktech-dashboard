"""Approved first installation on VM125; credentials arrive only on stdin."""
import hashlib,json,os,shutil,stat,subprocess,sys,tarfile,time,urllib.request,urllib.error
from pathlib import Path
from datetime import datetime,timezone

stage=Path('/home/kecktech/.cache/nexus-pilot-20260917')
manifest=json.loads((stage/'manifest.json').read_text())
files=json.loads((stage/'release-manifest.json').read_text())['files']
secret=json.load(sys.stdin)
required={'NEXUS_ASSISTANT_OPERATOR_TOKEN','SOVEREIGN_ASSISTANT_READ_KEY','LIT_ASSISTANT_READ_KEY'}
assert set(secret)==required and all(isinstance(v,str) and v and '\n' not in v and '\r' not in v and '\x00' not in v for v in secret.values())
assert len(secret['NEXUS_ASSISTANT_OPERATOR_TOKEN'])>=24
assert subprocess.check_output(['hostname'],text=True).strip()=='prod-nexus-assistant-01'
for p in ['/opt/nexus','/etc/nexus','/srv/nexus','/var/lib/nexus-assistant','/etc/systemd/system/nexus-assistant.service']:
    assert not os.path.lexists(p), 'Existing installation target; reconcile first'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for key,name in [('release','application.tar.gz'),('runtime','runtime.tar.xz'),('repositoryDocuments','documents.tar.gz')]:
    assert sha(stage/name)==manifest[key]['sha256'], 'Archive digest mismatch'

def extract_files(archive,destination,expected):
    with tarfile.open(archive) as tar:
        members=tar.getmembers()
        assert {m.name for m in members}==set(expected)
        assert len(members)==len(expected)
        for m in members:
            assert m.isfile() and not Path(m.name).is_absolute() and '..' not in Path(m.name).parts
        destination.mkdir(parents=True,exist_ok=False)
        tar.extractall(destination,filter='data')
    for name,digest in expected.items():
        p=destination/name
        assert sha(p)==digest
        os.chown(p,0,0);os.chmod(p,0o644)
    for p in [destination,*destination.rglob('*')]:
        if p.is_dir():os.chown(p,0,0);os.chmod(p,0o755)

installed=False
try:
    root=Path('/opt/nexus');root.mkdir(mode=0o755)
    with tarfile.open(stage/'runtime.tar.xz') as tar:
        for m in tar.getmembers():
            assert m.name.split('/')[0]=='node-v24.19.0-linux-x64' and '..' not in Path(m.name).parts and not m.name.startswith('/')
        tar.extractall(root,filter='data')
    (root/'node-v24.19.0-linux-x64').rename(root/'runtime')
    assert subprocess.check_output([str(root/'runtime/bin/node'),'--version'],text=True).strip()=='v24.19.0'
    release=root/'assistant/releases'/manifest['release']['identity']
    extract_files(stage/'application.tar.gz',release,files)
    (root/'assistant/current').symlink_to(release,target_is_directory=True)
    extract_files(stage/'documents.tar.gz',Path('/srv/nexus/repos'),manifest['repositoryDocuments']['files'])
    config=Path('/etc/nexus');config.mkdir(mode=0o700)
    values={**secret,'SOVEREIGN_ASSISTANT_URL':'http://10.20.0.122:8200','LIT_ASSISTANT_URL':'http://10.20.0.115:8202','NEXUS_ASSISTANT_REPO_ROOTS':'/srv/nexus/repos/kecktech-dashboard;/srv/nexus/repos/kecktech-infrastructure'}
    fd=os.open(config/'assistant.env',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,'w') as out:
        for key,value in values.items():out.write(key+'='+json.dumps(value,ensure_ascii=False)+'\n')
    unit=Path('/etc/systemd/system/nexus-assistant.service')
    shutil.copyfile(release/'deployment/nexus-assistant.service',unit);os.chmod(unit,0o644)
    installed=True
    subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
    subprocess.run(['systemctl','daemon-reload'],check=True,capture_output=True)
    subprocess.run(['systemctl','enable','--now','nexus-assistant.service'],check=True,capture_output=True)

    def call(method,path,body=None,auth=True):
        headers={'content-type':'application/json'}
        if auth:headers['authorization']='Bearer '+secret['NEXUS_ASSISTANT_OPERATOR_TOKEN']
        req=urllib.request.Request('http://127.0.0.1:8787'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=20) as response:return response.status,json.load(response)
        except urllib.error.HTTPError as error:return error.code,{}
    for attempt in range(20):
        try:
            status,cap=call('GET','/v1/system/capabilities')
            if status==200:break
        except urllib.error.URLError:pass
        time.sleep(1)
    else:raise RuntimeError('Readiness failed')
    assert call('GET','/v1/system/capabilities',auth=False)[0]==401
    assert cap['model']['available'] is False and cap['model']['cloudAllowed'] is False
    ids=[]
    for text,extra in [('Acceptance test: Which VMs are running?',{}),('Acceptance test: novel readiness verification',{'manuscriptId':'nexus-readiness-nonexistent-scope'})]:
        code,conversation=call('POST','/v1/conversations',{})
        assert code==201
        ids.append(conversation['id'])
        code,result=call('POST','/v1/conversations/'+conversation['id']+'/messages',{'text':text,**extra})
        assert code==200
        envelope=result['messages'][-1]['envelope']
        assert envelope['model']['provider']=='none'
        if not extra:assert len(envelope['citations'])>0
        else:assert len(envelope['citations'])==0 and envelope['unknowns']
    # Approved one-time service restart; no other unit is touched.
    subprocess.run(['systemctl','restart','nexus-assistant.service'],check=True,capture_output=True)
    for attempt in range(20):
        try:
            if call('GET','/v1/system/capabilities')[0]==200:break
        except urllib.error.URLError:pass
        time.sleep(1)
    else:raise RuntimeError('Restart readiness failed')
    for cid in ids:
        code,conversation=call('GET','/v1/conversations/'+cid)
        assert code==200 and len(conversation['messages'])==2
    state=Path('/var/lib/nexus-assistant/assistant-state.json')
    assert stat.S_IMODE(state.stat().st_mode)==0o600
    assert stat.S_IMODE(state.parent.stat().st_mode)==0o700
    listener=subprocess.check_output(['ss','-H','-ltn','sport = :8787'],text=True)
    assert '127.0.0.1:8787' in listener and '0.0.0.0:8787' not in listener and '[::]:8787' not in listener
    assert all(sha(release/n)==h for n,h in files.items())
    result={'at':datetime.now(timezone.utc).isoformat(),'result':'READ_ONLY_PILOT_ACCEPTANCE_PASSED','release':manifest['release']['identity'],'runtime':'24.19.0','unauthenticatedStatus':401,'domainReads':['Sovereign evidence','LiT explicit unknown'],'restartCount':1,'recordsPreserved':len(ids),'stateMode':'0600','stateDirectoryMode':'0700','listener':'127.0.0.1:8787','modelsEnabled':False,'domainWriteKeysPresent':False,'acceptanceConversationIds':ids}
    (stage/'acceptance.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
except Exception as error:
    if installed:
        subprocess.run(['systemctl','disable','--now','nexus-assistant.service'],capture_output=True)
    print(json.dumps({'result':'INSTALLATION_OR_ACCEPTANCE_FAILED','errorClass':type(error).__name__,'serviceStopDisableAttempted':installed,'statePreserved':True}))
    sys.exit(1)
