import { readFile } from "node:fs/promises";

const domains = new Set(["homelab", "fiction"]);
const statuses = new Set(["verified", "historical-stale", "contradicted", "inferred", "unknown"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateDomainMessage(value, now = Date.now()) {
  const errors = []; const kind = value?.kind;
  if (!domains.has(value?.domain)) errors.push("domain must be homelab or fiction");
  if (kind === "evidence.query") {
    if (!uuid.test(value.requestId ?? "")) errors.push("requestId must be a UUID");
    if (typeof value.question !== "string" || !value.question.trim() || value.question.length > 16000) errors.push("question must contain 1..16000 characters");
    if (value.domain === "fiction" && !value.manuscriptId) errors.push("fiction evidence requires manuscriptId");
    if (value.limit !== undefined && (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > 50)) errors.push("limit must be 1..50");
  } else if (kind === "evidence.result") {
    if (!uuid.test(value.requestId ?? "")) errors.push("requestId must be a UUID");
    if (!statuses.has(value.status)) errors.push("status is invalid");
    if (!Array.isArray(value.citations) || !Array.isArray(value.unknowns) || !Array.isArray(value.contradictions)) errors.push("citations, unknowns, and contradictions must be arrays");
    for (const citation of value.citations ?? []) if (value.domain === "fiction" && citation.manuscriptId !== value.manuscriptId) errors.push("fiction citation manuscriptId must match the result");
    if (value.status === "unknown" && !(value.unknowns?.length)) errors.push("unknown result must state unknowns");
    if (value.status === "contradicted" && !(value.contradictions?.length)) errors.push("contradicted result must state contradictions");
  } else if (kind === "proposal.execute") {
    if (!uuid.test(value.proposalId ?? "")) errors.push("proposalId must be a UUID");
    if (!/^[a-f0-9]{64}$/.test(value.approvalDigest ?? "")) errors.push("approvalDigest must be a SHA-256 hex digest");
    if (!value.action || !value.target || !value.expectedRevision || !value.rollback) errors.push("action, target, expectedRevision, and rollback are required");
    if (value.domain === "fiction" && !value.manuscriptId) errors.push("fiction proposal requires manuscriptId");
    const approved = Date.parse(value.approvedAt); const expires = Date.parse(value.expiresAt);
    if (!Number.isFinite(approved) || !Number.isFinite(expires) || approved >= expires) errors.push("approval time range is invalid");
    if (Number.isFinite(expires) && expires <= now) errors.push("proposal approval is expired");
  } else if (kind === "proposal.result") {
    if (!uuid.test(value.proposalId ?? "")) errors.push("proposalId must be a UUID");
    if (value.status !== "executed" || !value.revision || !value.auditId) errors.push("executed result requires revision and auditId");
  } else errors.push("kind is invalid");
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const file=process.argv[2];if(!file){console.error("Usage: node validate-unified-assistant-domain.mjs <message.json>");process.exit(2);}const errors=validateDomainMessage(JSON.parse(await readFile(file,"utf8")));if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Unified Assistant domain message valid: ${file}`);
}
