import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error("Usage: node scripts/verify-public-content.mjs <directory> [...directory]");
  process.exit(2);
}

const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
]);

const forbidden = [
  { name: "demo password field", pattern: /["']demoPassword["']\s*:/i },
  { name: "demo username field", pattern: /["']demoUser["']\s*:/i },
  { name: "rendered demo-login label", pattern: />\s*Demo login\s*</i },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

async function* filesUnder(root) {
  const rootStat = await stat(root);
  if (rootStat.isFile()) {
    yield root;
    return;
  }

  for (const entry of await readdir(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* filesUnder(entryPath);
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      yield entryPath;
    }
  }
}

const failures = [];
for (const root of roots) {
  for await (const file of filesUnder(root)) {
    const content = await readFile(file, "utf8");
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) {
        failures.push(`${file}: ${rule.name}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Public-content verification failed. Candidate secret content was found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Public-content verification passed for ${roots.join(", ")}.`);
