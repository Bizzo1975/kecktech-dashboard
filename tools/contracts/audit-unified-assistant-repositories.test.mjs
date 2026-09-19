import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { audit } from "./audit-unified-assistant-repositories.mjs";

async function roots(){const base=await mkdtemp(path.join(os.tmpdir(),"assistant-audit-"));return Object.fromEntries(await Promise.all(["nexus","broker","lit","sovereign"].map(async name=>{const root=path.join(base,name);await mkdir(root,{recursive:true});return [name,root];})));}
test("reports absent required integration files as incomplete",async()=>{const report=await audit(await roots());assert.equal(report.complete,false);assert.ok(report.checks.every(x=>x.status==="missing"));});
test("detects direct provider bypass in Nexus",async()=>{const value=await roots();const file=path.join(value.nexus,"apps/assistant-api/src/adapters.ts");await mkdir(path.dirname(file),{recursive:true});await writeFile(file,"fetch('http://ollama:11434')");const report=await audit(value);assert.equal(report.complete,false);assert.equal(report.forbiddenProviderBypasses.length,1);});
