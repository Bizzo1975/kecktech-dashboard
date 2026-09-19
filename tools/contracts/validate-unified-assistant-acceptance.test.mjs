import test from "node:test";
import assert from "node:assert/strict";
import { validateAcceptance } from "./validate-unified-assistant-acceptance.mjs";

const record = () => ({ contractVersion:"1.0", evidenceStatus:"LOCALLY VERIFIED — NOT DEPLOYED", deploymentAuthorized:false, localGates:[{id:"LOCAL-1",required:true,status:"pass",evidence:["test passed"]}], liveGates:[{id:"LIVE-1",status:"needs-capture",approvalRequired:true}] });
test("accepts local evidence with explicit live gates",()=>assert.deepEqual(validateAcceptance(record()),[]));
test("rejects deployment authorization",()=>{const value=record();value.deploymentAuthorized=true;assert.match(validateAcceptance(value).join(" "),/must be false/);});
test("rejects unsupported local pass without evidence",()=>{const value=record();value.localGates[0].evidence=[];assert.match(validateAcceptance(value).join(" "),/requires evidence/);});
test("rejects a locally asserted live pass",()=>{const value=record();value.liveGates[0].status="pass";assert.match(validateAcceptance(value).join(" "),/must not claim/);});
test("rejects duplicate gate identities",()=>{const value=record();value.liveGates[0].id="LOCAL-1";assert.match(validateAcceptance(value).join(" "),/duplicated/);});
