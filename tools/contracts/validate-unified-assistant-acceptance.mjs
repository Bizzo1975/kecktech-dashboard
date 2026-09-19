import { readFile } from "node:fs/promises";

const localStatuses = new Set(["incomplete", "partial", "pass"]);
const liveStatuses = new Set(["needs-capture", "pass"]);

export function validateAcceptance(value) {
  const errors = [];
  if (value?.contractVersion !== "1.0") errors.push("contractVersion must be 1.0");
  if (value?.evidenceStatus !== "LOCALLY VERIFIED — NOT DEPLOYED") errors.push("evidenceStatus must remain local/not deployed");
  if (value?.deploymentAuthorized !== false) errors.push("deploymentAuthorized must be false in the local record");
  if (!Array.isArray(value?.localGates) || !value.localGates.length) errors.push("localGates are required");
  if (!Array.isArray(value?.liveGates) || !value.liveGates.length) errors.push("liveGates are required");
  const ids = new Set();
  for (const gate of [...(value?.localGates ?? []), ...(value?.liveGates ?? [])]) {
    if (!gate.id || ids.has(gate.id)) errors.push(`gate id is missing or duplicated: ${gate.id ?? "<missing>"}`);
    ids.add(gate.id);
  }
  for (const gate of value?.localGates ?? []) {
    if (!localStatuses.has(gate.status)) errors.push(`${gate.id}: invalid local status`);
    if (gate.status === "pass" && (!Array.isArray(gate.evidence) || gate.evidence.length === 0)) errors.push(`${gate.id}: pass requires evidence`);
    if (gate.status !== "pass" && gate.required === false) errors.push(`${gate.id}: local completion gates cannot be made optional`);
  }
  for (const gate of value?.liveGates ?? []) if (!liveStatuses.has(gate.status)) errors.push(`${gate.id}: invalid live status`);
  if ((value?.liveGates ?? []).some((gate) => gate.status === "pass")) errors.push("local preparation must not claim a live gate passed");
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node validate-unified-assistant-acceptance.mjs <acceptance.json>"); process.exit(2); }
  const errors = validateAcceptance(JSON.parse(await readFile(file, "utf8")));
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`Unified Assistant acceptance record valid: ${file}`);
}
