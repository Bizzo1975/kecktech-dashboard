import subprocess,json,datetime,re
result={"capturedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"containers":[]}
names=subprocess.run(["docker","ps","-a","--format","{{.Names}}"],capture_output=True,text=True,check=True).stdout.splitlines()
patterns={"missing_dependency":r"host not found|connection refused|could not translate host|ECONNREFUSED|ENOTFOUND|can't connect|cannot connect",
"missing_file":r"no such file|unable to access jarfile|ENOENT|not found",
"permission":r"permission denied|EACCES","disk_full":r"no space left|ENOSPC",
"eula":r"agree to the EULA","memory":r"OutOfMemory|cannot allocate memory",
"database_error":r"database.*error|fatal:|FATAL:"}
for name in names:
    if not (name.startswith(("erpnext-","farmbot-","umami")) or name=="4af0d3b9-0b29-4c2c-ab38-7fb191a1dbca"): continue
    p=subprocess.run(["docker","inspect",name],capture_output=True,text=True,check=True)
    v=json.loads(p.stdout)[0]
    state=v.get("State",{})
    logs=subprocess.run(["docker","logs","--tail","100",name],capture_output=True,text=True)
    raw=logs.stdout+logs.stderr
    result["containers"].append({"name":name,"state":{k:state.get(k) for k in ["Status","ExitCode","OOMKilled","StartedAt","FinishedAt"]},
        "restartPolicy":v.get("HostConfig",{}).get("RestartPolicy",{}).get("Name"),
        "composeService":v.get("Config",{}).get("Labels",{}).get("com.docker.compose.service"),
        "logIndicators":{key:len(re.findall(pattern,raw,re.I)) for key,pattern in patterns.items()},
        "logCaveat":"Last 100 lines classified; no raw logs or error strings retained. Indicators are not a root-cause diagnosis."})
print(json.dumps(result))

