"""Explicitly approved Stage A only. Input baseline is supplied by the operator runner."""
import base64, datetime, gzip, hashlib, json, os, pathlib, re, shutil, subprocess, sys, time

def command(args, timeout=40, input=None):
    p = subprocess.run(args, input=input, capture_output=True, text=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError('command_failed:' + args[0])
    return p.stdout

def inspect(name):
    return json.loads(command(['docker','inspect',name]))[0]

def emit(event, **kw):
    print(json.dumps(dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat(), event=event, **kw)), flush=True)

def stop(name):
    if name == 'erpnext-scheduler-1':
        # Operator authorized resolving the scheduler stop after TERM timed out.
        # Its live signal mask confirms a SIGINT handler; request that exit first.
        command(['docker','kill','--signal','SIGINT',name])
        until = time.monotonic() + 45
        while time.monotonic() < until:
            if inspect(name)['State']['Status'] == 'exited':
                emit('stopped',name=name,signal='SIGINT')
                return
            time.sleep(1)
        raise RuntimeError('scheduler_interrupt_stop_timeout')
    # Infinite daemon timeout prevents SIGKILL; client wait remains bounded.
    command(['docker','stop','--timeout','-1',name], timeout=45)
    if inspect(name)['State']['Status'] != 'exited':
        raise RuntimeError('graceful_stop_not_confirmed')
    emit('stopped', name=name)

def approved_run(baseline, host):
    if host not in ('200','112'):
        raise RuntimeError('unapproved_host')
    agent = inspect('portainer_agent')
    if agent['State']['Status'] != 'running':
        raise RuntimeError('agent_initial_state_drift')
    def identity(v):
        return (v['Id'],v['Image'], sorted(v['Mounts'],key=lambda m:m['Destination']))
    original = identity(agent)
    emit('agent_baseline',host=host,containerId=agent['Id'],imageId=agent['Image'])
    try:
        stop('portainer_agent')
        main(baseline, host)
    finally:
        if identity(inspect('portainer_agent')) != original:
            raise RuntimeError('agent_identity_changed_manual_recovery_required')
        command(['docker','start','portainer_agent'])
        time.sleep(3)
        if inspect('portainer_agent')['State']['Status'] != 'running':
            raise RuntimeError('agent_restore_failed')
        emit('agent_restored',host=host,containerId=agent['Id'])

def main(baseline, host):
    clients = ['erpnext-scheduler-1','erpnext-frontend-1','erpnext-websocket-1'] if host == '200' else ['umami']
    db = 'erpnext-db-1' if host == '200' else 'umami-db'
    volumes = ['erpnext_db-data','erpnext_sites','erpnext_redis-queue-data'] if host == '200' else ['umami_umami_db_data']
    destination = pathlib.Path('/var/backups/kecktech-recovery/2026-09-15-stage-a')
    if host not in ('200','112') or os.geteuid() != 0 or destination.exists():
        raise RuntimeError('preflight_identity_or_destination')
    expected = {r['name']:r for r in baseline['containers']}
    for name, row in expected.items():
        v = inspect(name)
        mounts = [{k:m.get(k) for k in ('Type','Name','Source','Destination','RW')} for m in v['Mounts']]
        state = v['State']['Status']
        allowed = ('running','restarting') if row['state'] == 'restarting' else (row['state'],)
        canonical_mounts = lambda items: sorted(items, key=lambda m: (m['Destination'], m['Source']))
        if v['Id'] != row['id'] or v['Image'] != row['imageId'] or canonical_mounts(mounts) != canonical_mounts(row['mounts']) or state not in allowed:
            raise RuntimeError('preflight_drift:' + name)
    # Surface active sessions/mutation programs as a conservative concurrent-work gate.
    if command(['who']).strip():
        raise RuntimeError('interactive_session_present')
    processes = command(['ps','-eo','comm=']).splitlines()
    if any(p.strip() in ('rsync','vzdump','e2fsck','mysqldump','mariadb-dump','pg_dump') for p in processes):
        raise RuntimeError('concurrent_maintenance_present')
    paths = [pathlib.Path('/var/lib/docker/volumes') / v / '_data' for v in volumes]
    for p in paths:
        if not p.is_dir() or p.is_symlink():
            raise RuntimeError('missing_or_symlink_data')
    marker = paths[0] / ('mysql' if host == '200' else 'PG_VERSION')
    if not marker.exists():
        raise RuntimeError('existing_database_marker_missing')
    def writers(allowed):
        ids = command(['docker','ps','-q']).split()
        for cid in ids:
            v = inspect(cid)
            if v['Name'].lstrip('/') in allowed:
                continue
            for m in v['Mounts']:
                source = pathlib.Path(m['Source'])
                if m.get('RW') and any(source == p or source in p.parents or p in source.parents for p in paths):
                    raise RuntimeError('unexpected_data_writer')
    writers(clients)
    size = sum(int(command(['du','-sb',str(p)]).split()[0]) for p in paths)
    if shutil.disk_usage('/var/backups').free < size*2 + 2*1024**3:
        raise RuntimeError('insufficient_copy_capacity')
    emit('preflight_passed', host=host, apparentBytes=size)
    for name in clients:
        stop(name)
    writers([])
    os.umask(0o077)
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    manifest = {'host':host,'copies':[], 'approval':'User approved Stage A in current task'}
    for volume, path in zip(volumes, paths):
        archive = destination / (volume + '.tar')
        command(['tar','--acls','--xattrs','--numeric-owner','-cpf',str(archive),'-C',str(path),'.'],timeout=180)
        os.chmod(archive,0o600)
        command(['tar','--acls','--xattrs','--numeric-owner','-df',str(archive),'-C',str(path)],timeout=180)
        with archive.open('rb') as f:
            digest = hashlib.file_digest(f,'sha256').hexdigest()
        manifest['copies'].append({'archive':str(archive),'sha256':digest,'bytes':archive.stat().st_size,'sourceCompared':True})
        emit('copy_verified', **manifest['copies'][-1])
    (destination/'manifest.json').write_text(json.dumps(manifest,indent=2))
    writers([])
    if inspect(db)['State']['Status'] != 'exited':
        raise RuntimeError('database_state_drift')
    started = False
    try:
        # Mark before request so an ambiguous start failure is handled conservatively.
        started = True
        command(['docker','start',db])
        emit('database_started',name=db)
        started_at = inspect(db)['State']['StartedAt']
        restarts = inspect(db)['RestartCount']
        if host == '200':
            sql = 'export MYSQL_PWD="${MARIADB_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}"; test -n "$MYSQL_PWD" || exit 12; exec mariadb --protocol=tcp -h 127.0.0.1 -u root -Nse "SELECT 1"'
        else:
            sql = 'export PGPASSWORD="$POSTGRES_PASSWORD"; test -n "$PGPASSWORD" || exit 12; exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" -Atqc "SELECT 1"'
        for attempt in range(15):
            try:
                answer = command(['docker','exec',db,'sh','-c',sql],timeout=15).strip()
                if answer != '1': raise RuntimeError('query_result_mismatch')
                break
            except (RuntimeError,subprocess.TimeoutExpired):
                if attempt == 14: raise RuntimeError('database_query_failed')
                time.sleep(2)
        emit('authenticated_select_passed',name=db)
        until = time.monotonic()+300
        while time.monotonic() < until:
            time.sleep(min(30,max(0,until-time.monotonic())))
            v = inspect(db)
            if v['State']['Status'] != 'running' or v['RestartCount'] != restarts:
                raise RuntimeError('database_unstable')
            if command(['docker','exec',db,'sh','-c',sql],timeout=15).strip() != '1':
                raise RuntimeError('database_query_failed')
            emit('observation_passed',name=db,remainingSeconds=round(max(0,until-time.monotonic())))
        logs = subprocess.run(['docker','logs','--since',started_at,db],capture_output=True,text=True,timeout=30)
        if logs.returncode: raise RuntimeError('log_capture_failed')
        raw = logs.stdout+logs.stderr
        indicators = {k:len(re.findall(pattern,raw,re.I)) for k,pattern in {
            'corruption':r'corrupt|invalid page|checksum mismatch|PANIC:',
            'errors':r'\[ERROR\]|FATAL:|permission denied|no space left'}.items()}
        emit('log_indicators',**indicators)
        if any(indicators.values()): raise RuntimeError('database_log_indicators_require_review')
        for name in clients:
            if inspect(name)['State']['Status'] != 'exited': raise RuntimeError('client_state_drift')
        manifest['result']='Stage A database acceptance passed; application clients remain paused'
        manifest['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        (destination/'manifest.json').write_text(json.dumps(manifest,indent=2))
        emit('stage_a_passed',host=host,manifest=str(destination/'manifest.json'))
    except BaseException:
        if started:
            stop(db)
            emit('rollback_database_stopped',name=db)
        raise

if __name__ == '__main__':
    try:
        baseline = json.loads(gzip.decompress(base64.b64decode(sys.argv[2])))
        emit('baseline_loaded')
        approved_run(baseline,sys.argv[1])
    except BaseException as e:
        # Do not emit subprocess output, SQL connection values or raw exceptions.
        emit('stage_a_failed',category=type(e).__name__,reason=str(e) if type(e) is RuntimeError else 'execution_interrupted_or_failed')
        sys.exit(1)
