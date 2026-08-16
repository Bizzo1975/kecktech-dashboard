#!/usr/bin/env node
/**
 * Minimal HTTP wrapper for Kecktech Astro rebuild.
 * Run on the dashboard host (where Astro lives):
 *   KECKTECH_ASTRO_DIR=/opt/docker/dashboard/website \
 *   KECKTECH_ASTRO_REBUILD_SECRET=... \
 *   node scripts/kecktech-astro-rebuild-server.mjs
 *
 * Point ME Manager KECKTECH_ASTRO_REBUILD_URL at http://<dashboard-lan>:9797/rebuild
 */
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.KECKTECH_ASTRO_REBUILD_PORT || 9797);
const SECRET = process.env.KECKTECH_ASTRO_REBUILD_SECRET || "";
const SCRIPT = path.join(__dirname, "kecktech-astro-rebuild.sh");

function authorize(req) {
  if (!SECRET) return true;
  const h = req.headers.authorization || "";
  return h === `Bearer ${SECRET}`;
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.method !== "POST" || !req.url?.startsWith("/rebuild")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (!authorize(req)) {
    res.writeHead(401);
    res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    return;
  }

  const child = spawn("bash", [SCRIPT], {
    env: process.env,
    cwd: path.dirname(SCRIPT),
  });
  let out = "";
  let err = "";
  child.stdout.on("data", (d) => {
    out += d.toString();
  });
  child.stderr.on("data", (d) => {
    err += d.toString();
  });
  child.on("close", (code) => {
    const ok = code === 0;
    res.writeHead(ok ? 200 : 502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok,
        code,
        message: ok ? "Astro rebuild complete" : "Astro rebuild failed",
        stdout: out.slice(-2000),
        stderr: err.slice(-2000),
      })
    );
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kecktech Astro rebuild server on :${PORT}`);
});
