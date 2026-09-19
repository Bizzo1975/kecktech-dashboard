import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const probe=createServer(); probe.listen(0,'127.0.0.1'); await once(probe,'listening');
const port=probe.address().port; await new Promise(resolve=>probe.close(resolve));
const state=await mkdtemp(path.join(os.tmpdir(),'nexus-http-acceptance-'));
const token=randomBytes(32).toString('hex');
const env={NEXUS_ASSISTANT_OPERATOR_TOKEN:token,NEXUS_ASSISTANT_PORT:String(port),NEXUS_ASSISTANT_DATA_DIR:state,NEXUS_ASSISTANT_REPO_ROOTS:''};
let child;
async function start(){
 child=spawn(process.execPath,['.recovery-private/nexus-preparation/dist/index.js'],{env,stdio:['ignore','pipe','pipe']});
 child.stderr.resume();
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Process exited before readiness')}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Startup timeout')),5000);t.unref();})]);
}
async function stop(){const exited=once(child,'exit');child.kill();await exited;}
const call=(method,route,auth=true)=>fetch(`http://127.0.0.1:${port}${route}`,{method,headers:auth?{authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(5000)});
try {
 await start();
 assert.equal((await call('GET','/v1/system/capabilities',false)).status,401);
 assert.equal((await call('GET','/v1/system/capabilities')).status,200);
 const records=await Promise.all(Array.from({length:8},async()=>{const r=await call('POST','/v1/conversations');assert.equal(r.status,201);return r.json();}));
 await stop(); await start();
 for(const record of records){const r=await call('GET',`/v1/conversations/${record.id}`);assert.equal(r.status,200);assert.equal((await r.json()).id,record.id);}
 console.log(JSON.stringify({unauthenticatedStatus:401,authenticatedCapabilitiesStatus:200,concurrentCreates:8,preservedAfterProcessRestart:8,externalServicesConfigured:false,isolatedState:true}));
} finally {if(child && child.exitCode===null) await stop();}
