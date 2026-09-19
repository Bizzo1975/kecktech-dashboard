"""Apply narrowly reviewed persistence changes only if source has not changed."""
from pathlib import Path
import hashlib

root=Path('F:/Github/nexus/apps/assistant-api')
expected={'src/store.ts':'dcbf96d04325b436471e3e745c8b485cd805a66af6399d5dbfda1df564245897','src/service.ts':'57a7040e8d6b80c9ae9ee4479d0cb2b5405eb4b45c7ad787c9aeffb9148bc98a','package.json':'54745b0bd25bc9e966e330c855296b7571713e0a354e5c7d193c23f67666e5f6'}
for name,digest in expected.items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest, f'Concurrent edit: {name}'
assert not (root/'src/test/store.test.ts').exists()
store=(root/'src/store.ts').read_text()
store=store.replace('Conversation, Proposal','Conversation, Message, Proposal')
store=store.replace('export class JsonStore {', '''// One process owns each state file; serialize all read/modify/write operations.
const pendingWrites = new Map<string, Promise<void>>();
export class JsonStore {''')
store=store.replace('  private async read(): Promise<State> {', '''  private async mutate<T>(change: (state: State) => T): Promise<T> {
    const key = path.resolve(this.file);
    const previous = pendingWrites.get(key) ?? Promise.resolve();
    const operation = previous.then(async () => {
      const state = await this.read();
      const result = change(state);
      await this.write(state);
      return result;
    });
    const tail = operation.then(() => undefined, () => undefined);
    pendingWrites.set(key, tail);
    void tail.then(() => { if (pendingWrites.get(key) === tail) pendingWrites.delete(key); });
    return operation;
  }
  private async read(): Promise<State> {''')
start=store.index('  async createConversation():')
store=store[:start]+'''  async createConversation(): Promise<Conversation> {
    return this.mutate(state => {
      const now = new Date().toISOString();
      const value: Conversation = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, messages: [] };
      state.conversations[value.id] = value; return value;
    });
  }
  async getConversation(id: string): Promise<Conversation | undefined> { return (await this.read()).conversations[id]; }
  async saveConversation(value: Conversation): Promise<void> {
    await this.mutate(state => { state.conversations[value.id] = value; });
  }
  async appendMessages(id: string, messages: Message[]): Promise<Conversation> {
    return this.mutate(state => {
      const current = state.conversations[id];
      if (!current) throw new Error("Conversation not found");
      const updated = { ...current, messages: [...current.messages, ...messages], updatedAt: new Date().toISOString() };
      state.conversations[id] = updated; return updated;
    });
  }
  async saveProposal(value: Proposal, event = "proposal-created"): Promise<void> {
    await this.mutate(state => {
      state.proposals[value.id] = value;
      state.audit.push({ event, proposalId: value.id, at: new Date().toISOString(), state: value.state });
    });
  }
  async getProposal(id: string): Promise<Proposal | undefined> { return (await this.read()).proposals[id]; }
}
'''
service=(root/'src/service.ts').read_text()
old='const messages: Message[] = [...conversation.messages,'
assert service.count(old)==1
service=service.replace(old,'const messages: Message[] = [')
old='const updated = { ...conversation, messages, updatedAt: new Date().toISOString() }; await this.store.saveConversation(updated); return updated;'
assert service.count(old)==1
service=service.replace(old,'return this.store.appendMessages(conversation.id, messages);')
package=(root/'package.json').read_text()
package=package.replace('dist/test/streaming.test.js','dist/test/streaming.test.js dist/test/store.test.js')
tests='''import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {JsonStore} from "../store.js";
import {AssistantService} from "../service.js";

test("concurrent creates preserve every acknowledged conversation", async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"nexus-store-regression-"));
 const file=path.join(dir,"state.json"); const store=new JsonStore(file);
 const values=await Promise.all(Array.from({length:32},()=>store.createConversation()));
 for(const value of values) assert.deepEqual(await store.getConversation(value.id),value);
});
test("two instances sharing a file serialize writes", async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"nexus-store-regression-"));
 const file=path.join(dir,"state.json"); const stores=[new JsonStore(file),new JsonStore(file)];
 const values=await Promise.all(Array.from({length:16},(_,i)=>stores[i%2].createConversation()));
 for(const value of values) assert.ok(await stores[0].getConversation(value.id));
});
test("concurrent answers append to current state instead of stale snapshots", async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"nexus-store-regression-"));
 const store=new JsonStore(path.join(dir,"state.json")); const service=new AssistantService(store,new Map());
 const conversation=await store.createConversation();
 await Promise.all(Array.from({length:8},(_,i)=>service.append(conversation,`question ${i}`)));
 const actual=await store.getConversation(conversation.id);
 assert.equal(actual?.messages.length,16);
 assert.equal(new Set(actual?.messages.filter(m=>m.role==="user").map(m=>m.content)).size,8);
});
test("failed mutation does not block later valid writes", async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"nexus-store-regression-"));
 const store=new JsonStore(path.join(dir,"state.json"));
 await assert.rejects(()=>store.appendMessages("missing",[]),/Conversation not found/);
 const value=await store.createConversation(); assert.ok(await store.getConversation(value.id));
});
'''
(root/'src/store.ts').write_text(store,encoding='utf-8')
(root/'src/service.ts').write_text(service,encoding='utf-8')
(root/'package.json').write_text(package,encoding='utf-8')
(root/'src/test/store.test.ts').write_text(tests,encoding='utf-8')
print('Applied scoped persistence fix and four regressions; all source baselines checked.')
