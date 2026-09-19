import { readFile } from "node:fs/promises";

const allowedDomains = new Set(["homelab", "fiction", "repository", "cross-domain"]);
const allowedStatuses = new Set(["verified", "historical-stale", "contradicted", "inferred", "unknown"]);
const allowedProviders = new Set(["gpu-broker", "none"]);

export function validateEnvelope(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["envelope must be an object"];
  if (typeof value.answer !== "string" || !value.answer.trim()) errors.push("answer must be non-empty");
  if (!allowedDomains.has(value.domain)) errors.push("domain is invalid");
  if (!["question", "change-request"].includes(value.intent)) errors.push("intent is invalid");
  if (!allowedStatuses.has(value.evidenceStatus)) errors.push("evidenceStatus is invalid");
  if (!Array.isArray(value.citations)) errors.push("citations must be an array");
  else value.citations.forEach((citation, index) => {
    if (!citation || typeof citation !== "object") return errors.push(`citations[${index}] must be an object`);
    for (const field of ["id", "source", "location", "capturedAt", "status", "excerpt"]) if (typeof citation[field] !== "string" || !citation[field]) errors.push(`citations[${index}].${field} is required`);
    if (!allowedStatuses.has(citation.status)) errors.push(`citations[${index}].status is invalid`);
    if (value.domain === "fiction" && !citation.manuscriptId) errors.push(`citations[${index}].manuscriptId is required for fiction`);
  });
  if (!value.model || !allowedProviders.has(value.model.provider)) errors.push("model.provider is invalid");
  if (value.model?.provider === "gpu-broker" && !value.model.jobId) errors.push("gpu-broker responses require model.jobId");
  if (value.model?.provider === "none" && value.model.model !== null) errors.push("model must be null when provider is none");
  if (!Array.isArray(value.unknowns)) errors.push("unknowns must be an array");
  if (!Array.isArray(value.contradictions)) errors.push("contradictions must be an array");
  if (value.evidenceStatus === "unknown" && (!Array.isArray(value.unknowns) || value.unknowns.length === 0)) errors.push("unknown evidence requires at least one unknown");
  if (value.evidenceStatus === "contradicted" && (!Array.isArray(value.contradictions) || value.contradictions.length === 0)) errors.push("contradicted evidence requires at least one contradiction");
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node validate-unified-assistant-contract.mjs <envelope.json>"); process.exit(2); }
  const errors = validateEnvelope(JSON.parse(await readFile(file, "utf8")));
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`Unified Assistant contract valid: ${file}`);
}
