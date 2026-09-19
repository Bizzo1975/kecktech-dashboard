import { readFile } from "node:fs/promises";

const secretKeys = ["NEXUS_ASSISTANT_OPERATOR_TOKEN", "SOVEREIGN_ASSISTANT_READ_KEY", "SOVEREIGN_ASSISTANT_WRITE_KEY", "LIT_ASSISTANT_READ_KEY", "LIT_ASSISTANT_WRITE_KEY", "GPU_BROKER_API_KEY"];
const forbiddenKeys = ["OLLAMA_URL", "OLLAMA_BASE_URL", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"];

export function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line)=>line.trim()).filter((line)=>line && !line.startsWith("#") && line.includes("=")).map((line)=>{const index=line.indexOf("=");return [line.slice(0,index),line.slice(index+1)];}));
}

export function validateTemplate(text) {
  const env = parseEnv(text); const errors = [];
  for (const key of secretKeys) if (!(key in env)) errors.push(`${key} is missing`); else if (env[key]) errors.push(`${key} must be blank in source control`);
  for (const key of forbiddenKeys) if (key in env) errors.push(`${key} is forbidden; route models through GPU Broker`);
  if (env.NEXUS_ASSISTANT_MODEL_DOWNLOADS_ENABLED !== "0") errors.push("model downloads must be disabled by default");
  if (env.NEXUS_ASSISTANT_CLOUD_ALLOWED !== "0") errors.push("cloud must be disabled by default");
  if (env.NEXUS_ASSISTANT_GPU_APP_ID !== "nexus-assistant") errors.push("GPU app identity must be nexus-assistant");
  if (env.NEXUS_ASSISTANT_GPU_JOB_CLASS !== "llm") errors.push("GPU job class must be llm");
  const retries = Number(env.NEXUS_ASSISTANT_GPU_MAX_RETRIES); if (!Number.isInteger(retries) || retries < 0 || retries > 3) errors.push("GPU retries must be between 0 and 3");
  const timeout = Number(env.NEXUS_ASSISTANT_GPU_TIMEOUT_MS); if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) errors.push("GPU timeout must be between 1s and 5m");
  const disk = Number(env.NEXUS_ASSISTANT_MIN_FREE_DISK_GB); if (!Number.isInteger(disk) || disk < 100) errors.push("minimum free disk must be at least 100 GB");
  const bind = env.NEXUS_ASSISTANT_BIND_HOST; if (!["127.0.0.1", "::1"].includes(bind)) errors.push("template must bind locally until an approved edge/auth design exists");
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const file = process.argv[2]; if (!file) { console.error("Usage: node validate-unified-assistant-env.mjs <env.example>"); process.exit(2); }
  const errors = validateTemplate(await readFile(file,"utf8")); if(errors.length){console.error(errors.join("\n"));process.exit(1);} console.log(`Unified Assistant environment template valid: ${file}`);
}
