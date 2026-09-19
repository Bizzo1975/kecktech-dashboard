import { access, readFile } from "node:fs/promises";
import path from "node:path";

const defaults = {
  nexus: "F:/Github/nexus",
  broker: "F:/Github/gpu-broker",
  lit: "F:/Github/Huxley",
  sovereign: "F:/Github/sovereign-standalone"
};

const requirements = [
  ["NEXUS-API", "nexus", "apps/assistant-api/src/index.ts"],
  ["NEXUS-UI", "nexus", "apps/assistant-ui/src/index.html"],
  ["NEXUS-ADR", "nexus", "docs/adr/ADR-001-unified-personal-assistant-boundaries.md"],
  ["NEXUS-BROKER", "nexus", "apps/assistant-api/src/gpuBroker.ts"],
  ["NEXUS-STREAM", "nexus", "apps/assistant-api/src/streaming.ts"],
  ["NEXUS-DEPLOY", "nexus", "apps/assistant-api/deploy/README.md"],
  ["BROKER-POLICY", "broker", "config/consumers/nexus-assistant.yaml"],
  ["BROKER-CONTRACT-TEST", "broker", "tests/test_nexus_assistant_contract.py"],
  ["LIT-EVIDENCE", "lit", "apps/lit-api/src/lit/routes/assistant_evidence_routes.py"],
  ["LIT-CONTRACT-TEST", "lit", "apps/lit-api/tests/test_assistant_evidence_contract.py"],
  ["SOV-EVIDENCE", "sovereign", "app/routers/assistant_evidence.py"],
  ["SOV-CONTRACT-TEST", "sovereign", "tests/test_assistant_evidence_contract.py"]
];

async function exists(file) { try { await access(file); return true; } catch { return false; } }

export async function audit(roots = defaults) {
  const checks = [];
  for (const [id, repo, relative] of requirements) {
    const file = path.resolve(roots[repo], relative); checks.push({ id, repository: repo, path: file, status: await exists(file) ? "present" : "missing" });
  }
  const nexusFiles = ["apps/assistant-api/src/adapters.ts", "apps/assistant-api/src/service.ts", "apps/assistant-api/src/index.ts"];
  const bypasses = [];
  for (const relative of nexusFiles) {
    const file = path.resolve(roots.nexus, relative); if (!(await exists(file))) continue;
    const text = await readFile(file,"utf8");
    for (const pattern of [/ollama/i,/api\.openai\.com/i,/api\.anthropic\.com/i]) if (pattern.test(text)) bypasses.push({ file, pattern: String(pattern) });
  }
  const complete = checks.every((item)=>item.status==="present") && bypasses.length===0;
  return { evidenceStatus:"LOCALLY VERIFIED — NOT DEPLOYED", complete, checks, forbiddenProviderBypasses:bypasses };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const report=await audit();console.log(JSON.stringify(report,null,2));if(!report.complete)process.exitCode=1;
}
