"""Approved Phase B web recovery; queues/scheduler deliberately excluded."""
import subprocess,json,time,urllib.request,urllib.error,datetime
targets=[('erpnext-redis-cache-1','08ac949bed965555657fced415940d809b7226ab6cf56411137efdf762f87297'),('erpnext-redis-queue-1','8e22aa7b4ff9d2d9d6ac616fa675c547651c0b1069599a063dcc024b676a7b59'),('erpnext-backend-1','8f60b5207951d85fc1c667c2d1f5c5f1cf4a57fd48d703738bb351b685929884'),('erpnext-websocket-1','cb7915d4174e877bfe4abe5aad8bc1ee5dc62fba9e16db962ac879d95f4734f2'),('erpnext-frontend-1','ed0cd344cfc03606424516d30c20253745812fb8a17620aadc6c67bfec5a8b88')]
def cmd(a):
 p=subprocess.run(a,capture_output=True,text=True,timeout=30)
 if p.returncode:raise RuntimeError('command_failed')
 return p.stdout
def inspect(n):return json.loads(cmd(['docker','inspect',n]))[0]
def emit(event,**kw):print(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'event':event,**kw}),flush=True)
for n,i in targets:
 v=inspect(n);assert v['Id']==i and v['State']['Status']=='exited'
assert inspect('erpnext-db-1')['State']['Status']=='running'
for n in ['erpnext-scheduler-1','erpnext-queue-short-1','erpnext-queue-long-1']:
 assert inspect(n)['State']['Status']=='exited'
started=[]
try:
 for n,i in targets:
  started.append(n);cmd(['docker','start',n]);emit('started',name=n)
  if 'redis-' in n:
   for attempt in range(15):
    try:
     if cmd(['docker','exec',n,'redis-cli','PING']).strip()=='PONG':break
    except RuntimeError:pass
    time.sleep(1)
   else:raise RuntimeError('redis_unavailable')
 for attempt in range(30):
  try:
   req=urllib.request.Request('http://127.0.0.1:8080/api/method/ping',headers={'Host':'ops.kecktech.net'})
   with urllib.request.urlopen(req,timeout=5) as r:
    assert json.loads(r.read()).get('message')=='pong'
   break
  except Exception:
   time.sleep(2)
 else:raise RuntimeError('active_site_http_failed')
 emit('active_site_ping_passed')
 time.sleep(30)
 for n,i in targets:
  assert inspect(n)['State']['Status']=='running'
 emit('web_startup_passed',workersAndScheduler='paused',applicationAcceptance='incomplete')
except BaseException as e:
 for n in reversed(started):
  try:
   subprocess.run(['docker','stop','--timeout','-1',n],capture_output=True,text=True,timeout=45)
   emit('rollback',name=n,state=inspect(n)['State']['Status'])
  except Exception:emit('rollback_needs_attention',name=n)
 emit('phase_b_failed',reason=str(e) if isinstance(e,RuntimeError) else type(e).__name__)
 raise SystemExit(1)
