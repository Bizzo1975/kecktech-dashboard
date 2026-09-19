"""Derive a searchable runtime catalog without turning process state into app health."""
import json
import re
from pathlib import Path

SECTIONS = {"TIME", "HOST", "DOCKER", "SERVICES", "TIMERS", "LISTENERS", "DISK"}

def parse_guest(guest):
    sections = {}
    current = None
    for raw in (guest.get("output") or "").splitlines():
        line = raw.strip()
        if line in SECTIONS:
            current = line
            sections[current] = []
        elif current and line:
            sections[current].append(line)
    rows = []
    for line in sections.get("DOCKER", []):
        parts = line.split("|", 3)
        if len(parts) == 4:
            name, image, state, ports = parts
            rows.append({"id":f"{guest['vmid']}:docker:{name}", "runtime":"docker",
                         "name":name,"image":image,"observedState":state,"listeners":ports,
                         "evidenceLayer":"container state only"})
    for line in sections.get("SERVICES", []):
        match = re.match(r"^(?:●\s*)?(\S+\.service)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$",line)
        if match:
            name, load, active, sub, description = match.groups()
            rows.append({"id":f"{guest['vmid']}:systemd:{name}", "runtime":"systemd",
                         "name":name,"observedState":f"{load}/{active}/{sub}",
                         "description":description,"evidenceLayer":"unit state only"})
    for line in sections.get("TIMERS", []):
        match = re.search(r"(\S+\.timer)\s+(\S+\.service)\s*$",line)
        if match:
            name, activates = match.groups()
            rows.append({"id":f"{guest['vmid']}:timer:{name}","runtime":"timer","name":name,
                         "activates":activates,"observedState":line,"evidenceLayer":"schedule metadata only"})
    for row in rows:
        row.update({"hostId":guest["vmid"], "accountableOperator":"Jon Keck",
                    "applicationOwner":"NEEDS CAPTURE", "sourceRevision":None,
                    "applicationAcceptance":"not_verified", "capturedAt":guest["capturedAt"]})
        if row["name"].startswith("claudette-"):
            row["applicationOwner"]="Kecktech Operations — retired-workflow cleanup"
    return rows

def build(data):
    rows = [row for guest in data["guests"] for row in parse_guest(guest)]
    if len({row["id"] for row in rows}) != len(rows):
        raise ValueError("Duplicate runtime identity")
    return {"schemaVersion":"1.0","capturedAt":data["capturedAt"],
            "scope":"Derived metadata; not a complete application/dependency/provenance catalog.",
            "gaps":["Stopped guests not inspected internally","Cron/task command ownership not captured",
                    "Per-runtime dependencies, data classification, recovery and source parity remain incomplete"],
            "guests":[{key:value for key,value in guest.items() if key!="output"} for guest in data["guests"]],
            "runtimes":rows}

if __name__ == "__main__":
    import sys
    source, target = map(Path,sys.argv[1:3])
    catalog = build(json.loads(source.read_text(encoding="utf-8-sig")))
    target.write_text(json.dumps(catalog,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"guests":len(catalog["guests"]),"runtimes":len(catalog["runtimes"]),
                      "containers":sum(r["runtime"]=="docker" for r in catalog["runtimes"])}))

