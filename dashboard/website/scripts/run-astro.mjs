import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const command = process.argv[2];
if (!command) {
  console.error("Usage: node scripts/run-astro.mjs <command> [...args]");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const packagePath = require.resolve("astro/package.json");
const packageMetadata = JSON.parse(readFileSync(packagePath, "utf8"));
const cliRelativePath = typeof packageMetadata.bin === "string" ? packageMetadata.bin : packageMetadata.bin?.astro;
if (!cliRelativePath) {
  console.error("Unable to resolve the Astro CLI from its package metadata.");
  process.exit(1);
}
const cliPath = path.resolve(path.dirname(packagePath), cliRelativePath);

const result = spawnSync(
  process.execPath,
  [cliPath, command, ...process.argv.slice(3)],
  {
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Unable to run Astro: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
