import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateTemplate } from "./validate-unified-assistant-env.mjs";

const file = new URL("../../ops/recovery/unified-assistant.env.example", import.meta.url);
test("checked-in deployment template is fail closed",async()=>assert.deepEqual(validateTemplate(await readFile(file,"utf8")),[]));
test("rejects committed credentials",async()=>{const text=(await readFile(file,"utf8")).replace("GPU_BROKER_API_KEY=","GPU_BROKER_API_KEY=secret");assert.match(validateTemplate(text).join(" "),/must be blank/);});
test("rejects direct model-provider bypass",async()=>{const text=`${await readFile(file,"utf8")}\nOLLAMA_URL=http://ollama:11434`;assert.match(validateTemplate(text).join(" "),/forbidden/);});
test("rejects enabled downloads",async()=>{const text=(await readFile(file,"utf8")).replace("MODEL_DOWNLOADS_ENABLED=0","MODEL_DOWNLOADS_ENABLED=1");assert.match(validateTemplate(text).join(" "),/disabled/);});
test("rejects unsafe storage headroom",async()=>{const text=(await readFile(file,"utf8")).replace("MIN_FREE_DISK_GB=100","MIN_FREE_DISK_GB=10");assert.match(validateTemplate(text).join(" "),/100 GB/);});
