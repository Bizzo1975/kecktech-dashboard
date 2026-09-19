import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvelope } from "./validate-unified-assistant-contract.mjs";

const valid = () => ({ answer:"Unknown.",domain:"homelab",intent:"question",citations:[],evidenceStatus:"unknown",model:{provider:"none",model:null,reason:"Evidence unavailable"},unknowns:["No current capture"],contradictions:[] });
test("accepts an honest unavailable response",()=>assert.deepEqual(validateEnvelope(valid()),[]));
test("rejects unknown without a stated unknown",()=>{const value=valid();value.unknowns=[];assert.match(validateEnvelope(value).join(" "),/at least one unknown/);});
test("rejects broker attribution without a durable job id",()=>{const value=valid();value.model={provider:"gpu-broker",model:"approved-model",reason:"synthesis"};assert.match(validateEnvelope(value).join(" "),/jobId/);});
test("requires manuscript identity on fiction citations",()=>{const value=valid();value.domain="fiction";value.evidenceStatus="verified";value.unknowns=[];value.citations=[{id:"1",source:"lit",location:"kb:1",revision:"r1",capturedAt:"2026-09-01T00:00:00Z",status:"verified",excerpt:"fact"}];assert.match(validateEnvelope(value).join(" "),/manuscriptId/);});
test("requires surfaced contradictions",()=>{const value=valid();value.evidenceStatus="contradicted";assert.match(validateEnvelope(value).join(" "),/at least one contradiction/);});
