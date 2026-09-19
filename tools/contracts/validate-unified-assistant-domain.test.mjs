import test from "node:test";
import assert from "node:assert/strict";
import { validateDomainMessage } from "./validate-unified-assistant-domain.mjs";

const id="123e4567-e89b-42d3-a456-426614174000";const future="2099-01-01T00:15:00Z";
test("accepts bounded homelab evidence query",()=>assert.deepEqual(validateDomainMessage({kind:"evidence.query",requestId:id,domain:"homelab",question:"What is known?",limit:10}),[]));
test("rejects fiction query without manuscript identity",()=>assert.match(validateDomainMessage({kind:"evidence.query",requestId:id,domain:"fiction",question:"Who is present?"}).join(" "),/manuscriptId/));
test("rejects cross-manuscript citation",()=>assert.match(validateDomainMessage({kind:"evidence.result",requestId:id,domain:"fiction",manuscriptId:"work-a",status:"verified",citations:[{manuscriptId:"work-b"}],unknowns:[],contradictions:[]}).join(" "),/must match/));
test("rejects expired proposal",()=>assert.match(validateDomainMessage({kind:"proposal.execute",proposalId:id,domain:"homelab",action:"update",target:"x",payload:{},expectedRevision:"r1",approvalDigest:"a".repeat(64),approvedAt:"2025-01-01T00:00:00Z",expiresAt:"2025-01-01T00:15:00Z",rollback:"restore"},Date.parse("2026-01-01T00:00:00Z")).join(" "),/expired/));
test("accepts future fiction proposal with manuscript identity",()=>assert.deepEqual(validateDomainMessage({kind:"proposal.execute",proposalId:id,domain:"fiction",action:"propose-canon-change",target:"fact-1",payload:{},expectedRevision:"r1",approvalDigest:"a".repeat(64),approvedAt:"2099-01-01T00:00:00Z",expiresAt:future,rollback:"restore revision",manuscriptId:"work-a"},Date.parse("2098-01-01T00:00:00Z")),[]));
