import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import test from "node:test";

const scanner = path.resolve("scripts/verify-public-content.mjs");

function scan(target) {
  return spawnSync(process.execPath, [scanner, target], {
    encoding: "utf8",
  });
}

test("accepts client content without credential fields", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "kecktech-public-safe-"));
  try {
    await writeFile(path.join(fixtureRoot, "safe.json"), JSON.stringify({ available: true }));
    const result = scan(fixtureRoot);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("blocks a fake demo credential field without printing its value", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "kecktech-public-secret-"));
  const fakeValue = "TEST_ONLY_FAKE_CREDENTIAL_VALUE";
  try {
    await writeFile(
      path.join(fixtureRoot, "unsafe.json"),
      JSON.stringify({ demoPassword: fakeValue }),
    );
    const result = scan(fixtureRoot);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /demo password field/i);
    assert.doesNotMatch(result.stderr, new RegExp(fakeValue));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
