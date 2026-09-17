import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatHealthStatus, HEALTH_CONTRACT_VERSION, HEALTH_STATUSES, summarizeHealth } from "./healthContract.mjs";

test("v2 contract contains every supported state exactly once", () => {
  assert.equal(HEALTH_CONTRACT_VERSION, "2.0.0");
  assert.equal(new Set(HEALTH_STATUSES).size, HEALTH_STATUSES.length);
  assert.deepEqual(HEALTH_STATUSES, [
    "ready", "application_available", "reachable", "auth_required", "redirected", "degraded", "unreachable", "not_monitored",
  ]);
});

test("summary never promotes application availability or reachability to readiness", () => {
  const summary = summarizeHealth(HEALTH_STATUSES.map((status) => ({ status })));
  assert.deepEqual(summary, {
    total: 8,
    ready: 1,
    applicationAvailable: 1,
    reachable: 1,
    authRequired: 1,
    redirected: 1,
    degraded: 1,
    unreachable: 1,
    notMonitored: 1,
  });
});

test("operator labels preserve weaker successful evidence", () => {
  assert.match(formatHealthStatus("application_available", "success", 14), /app available; dependencies unverified/);
  assert.match(formatHealthStatus("reachable", "success", 9), /reachable; readiness unverified/);
  assert.equal(formatHealthStatus("unreachable", "tls_error", 0), "TLS verification failed");
});

test("published JSON Schema matches the executable v2 status contract", async () => {
  const schemaUrl = new URL("../../../docs/contracts/dashboard-health-v2.schema.json", import.meta.url);
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
  assert.equal(schema.properties.contractVersion.const, HEALTH_CONTRACT_VERSION);
  assert.deepEqual(schema.$defs.status.enum, HEALTH_STATUSES);
  assert.deepEqual(
    Object.keys(schema.$defs.summary.properties),
    Object.keys(summarizeHealth([])),
  );
});
