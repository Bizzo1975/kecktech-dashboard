import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { checkHealth, classifyHttpStatus, classifyRequestError } from "./checkHealth.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Missing test listener address"));
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("classifies only 2xx responses as ready", () => {
  assert.deepEqual(classifyHttpStatus(204), { status: "ready", reason: "success" });
  assert.deepEqual(classifyHttpStatus(302), { status: "redirected", reason: "redirect_response" });
  assert.deepEqual(classifyHttpStatus(401), { status: "auth_required", reason: "authentication_required" });
  assert.deepEqual(classifyHttpStatus(403), { status: "auth_required", reason: "authentication_required" });
  assert.deepEqual(classifyHttpStatus(503), { status: "degraded", reason: "unexpected_http_status" });
});

test("preserves the configured evidence level for successful responses", () => {
  assert.deepEqual(classifyHttpStatus(200, "application_available"), { status: "application_available", reason: "success" });
  assert.deepEqual(classifyHttpStatus(204, "reachable"), { status: "reachable", reason: "success" });
});

test("does not promote redirects or authorization responses to readiness", async () => {
  for (const statusCode of [200, 302, 401, 403, 503]) {
    const server = createServer((_request, response) => {
      response.writeHead(statusCode, statusCode === 302 ? { Location: "/login" } : undefined);
      response.end();
    });
    const port = await listen(server);
    try {
      const result = await checkHealth(`http://127.0.0.1:${port}/health`, undefined, 1000);
      assert.equal(result.statusCode, statusCode);
      assert.equal(result.status, statusCode === 200 ? "ready" : statusCode === 302 ? "redirected" : statusCode === 401 || statusCode === 403 ? "auth_required" : "degraded");
    } finally {
      await close(server);
    }
  }
});

test("a root-page success proves reachability but not readiness", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200);
    response.end();
  });
  const port = await listen(server);
  try {
    const result = await checkHealth(`http://127.0.0.1:${port}/`, undefined, 1000, "reachable");
    assert.equal(result.status, "reachable");
    assert.notEqual(result.status, "ready");
  } finally {
    await close(server);
  }
});

test("reports timeout separately from other network failures", async () => {
  const server = createServer(() => undefined);
  const port = await listen(server);
  try {
    const result = await checkHealth(`http://127.0.0.1:${port}/health`, undefined, 25);
    assert.equal(result.status, "unreachable");
    assert.equal(result.reason, "timeout");
  } finally {
    server.closeAllConnections();
    await close(server);
  }
});

test("classifies certificate failures without exposing error details", () => {
  assert.deepEqual(classifyRequestError({ code: "DEPTH_ZERO_SELF_SIGNED_CERT" }), { status: "unreachable", reason: "tls_error" });
});
