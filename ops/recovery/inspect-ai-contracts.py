import json, urllib.request, urllib.error, datetime
out={"capturedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"evidenceLayer":"read-only HTTP metadata; no inference or data writes","checks":[]}
for name,port in [("gpu-broker",8090),("argo",8100),("lit",8202),("asset-forge",8787),("voice",8008)]:
    row={"service":name,"port":port}
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/openapi.json",timeout=5) as r:
            data=json.load(r)
            paths=data.get("paths",{})
            row["openapiStatus"]=r.status
            row["relevantPaths"]=[p for p in paths if any(s in p.lower() for s in ["health","ready","assistant","jobs","assign","activate"])]
            row["hasJobs"]="/v1/jobs" in paths
    except Exception as e: row["openapiError"]=type(e).__name__
    out["checks"].append(row)
try:
    with urllib.request.urlopen("http://127.0.0.1:11434/api/tags",timeout=5) as r:
        data=json.load(r)
        out["ollamaModels"]=[{"name":m.get("name"),"digest":m.get("digest"),"bytes":m.get("size")} for m in data.get("models",[])]
except Exception as e: out["ollamaError"]=type(e).__name__
print(json.dumps(out))

