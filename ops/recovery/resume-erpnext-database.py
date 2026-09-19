"""Resume approved database acceptance from verified existing cold-copy manifest."""
import datetime,hashlib,json,pathlib,subprocess,time,shlex,re
def active_site_credentials(configs):
 if 'ops.kecktech.net' not in configs:
  raise RuntimeError('active_site_config_missing')
 c=configs['ops.kecktech.net']
 if not c.get('db_name') or not c.get('db_password'):
  raise RuntimeError('active_site_credential_missing')
 return [(c.get('db_user',c['db_name']),c['db_password'],c['db_name'])]
def emit(event,**fields):
 print(json.dumps({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'event':event,**fields}),flush=True)
def run(args,input=None):
 return subprocess.run(args,input=input,capture_output=True,text=True,timeout=30)
def inspect(n):
 p=run(['docker','inspect',n]); assert p.returncode==0
 return json.loads(p.stdout)[0]
db='erpnext-db-1'
root=pathlib.Path('/var/backups/kecktech-recovery/2026-09-15-stage-a')
manifest=json.loads((root/'manifest.json').read_text())
assert manifest['host']=='200' and len(manifest['copies'])==3
for c in manifest['copies']:
 p=pathlib.Path(c['archive']); assert p.parent==root
 with p.open('rb') as f: assert hashlib.file_digest(f,'sha256').hexdigest()==c['sha256']
assert inspect(db)['Id']=='bbb86613c1387790a162b5dfea0f94e05533dff58626db100a8f6a3e7ec77e6b'
assert inspect(db)['State']['Status'] in ('exited','running')
for n in ['erpnext-scheduler-1','erpnext-frontend-1','erpnext-websocket-1','erpnext-backend-1','erpnext-queue-short-1','erpnext-queue-long-1']:
 assert inspect(n)['State']['Status']=='exited'
# Credentials remain in memory and are passed through stdin, never output or argv.
configs={}
for p in pathlib.Path('/var/lib/docker/volumes/erpnext_sites/_data').glob('*/site_config.json'):
 configs[p.parent.name]=json.loads(p.read_text())
credentials=active_site_credentials(configs)
def query(credential):
 user,password,database=credential
 address=inspect(db)['NetworkSettings']['Networks']['erpnext_frappe_network']['IPAddress']
 assert re.fullmatch(r'[0-9.]+',address)
 script='export MYSQL_PWD='+shlex.quote(password)+'\nexec mariadb --protocol=tcp -h '+address+' -u '+shlex.quote(user)+' -D '+shlex.quote(database)+' -Nse '+shlex.quote('SELECT 1')+'\n'
 p=run(['docker','exec','-i',db,'sh'],input=script)
 return p.returncode==0 and p.stdout.strip()=='1'
try:
 if inspect(db)['State']['Status']=='exited':
  assert run(['docker','start',db]).returncode==0
 emit('database_started')
 start=inspect(db)['State']['StartedAt']; restarts=inspect(db)['RestartCount']
 for attempt in range(15):
  if all(query(c) for c in credentials):break
  time.sleep(2)
 else:raise RuntimeError('application_credential_query_failed')
 emit('application_database_queries_passed',sites=len(credentials))
 until=time.monotonic()+300
 while time.monotonic()<until:
  time.sleep(min(30,max(0,until-time.monotonic())))
  v=inspect(db)
  assert v['State']['Status']=='running' and v['RestartCount']==restarts
  assert all(query(c) for c in credentials)
  emit('observation_passed',remainingSeconds=round(max(0,until-time.monotonic())))
 p=run(['docker','logs','--since',start,db]);assert p.returncode==0
 indicators={k:len(re.findall(pattern,p.stdout+p.stderr,re.I)) for k,pattern in {'corruption':'corrupt|invalid page|checksum mismatch','errors':r'\[ERROR\]|permission denied|no space left'}.items()}
 emit('startup_log_indicators',**indicators)
 assert not any(indicators.values())
 emit('stage_a_passed',database=db)
 manifest['result']='Passed using existing application-held database credentials; clients paused'
 manifest['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 (root/'acceptance-application-credentials.json').write_text(json.dumps(manifest,indent=2))
 (root/'acceptance-application-credentials.json').chmod(0o600)
except BaseException:
 p=subprocess.run(['docker','stop','--timeout','-1',db],capture_output=True,text=True,timeout=45)
 emit('acceptance_failed',databaseStopped=p.returncode==0)
 raise SystemExit(1)
