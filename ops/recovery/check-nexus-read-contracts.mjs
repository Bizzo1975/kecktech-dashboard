// Load existing operator-owned environment with node --env-file; never print values.
const results = [];
for (const [domain, prefix, body] of [
  ['Sovereign', 'SOVEREIGN', {text:'Which VMs are running?', projectSlug:'kecktech-ops', limit:2}],
  ['LiT', 'LIT', {text:'readiness verification', manuscriptId:'nexus-readiness-nonexistent-scope', limit:1}],
]) {
  const base = process.env[`${prefix}_ASSISTANT_URL`];
  const key = process.env[`${prefix}_ASSISTANT_READ_KEY`];
  if (!base || !key) { results.push({domain,configured:false}); continue; }
  const item = {domain, configured:true};
  for (const authenticated of [false,true]) {
    const label = authenticated ? 'readKey' : 'unauthenticated';
    try {
      const response = await fetch(`${base}/v1/evidence/query`, {method:'POST', redirect:'error', headers:{'content-type':'application/json', ...(authenticated?{'x-api-key':key}:{})}, body:JSON.stringify(body), signal:AbortSignal.timeout(12000)});
      const outcome={status:response.status};
      if (response.ok) {
        const data=await response.json();
        outcome.citationsArray=Array.isArray(data.citations);
        outcome.citationCount=data.citations?.length;
        outcome.citationShapeValid=Array.isArray(data.citations) && data.citations.every(c=>['id','source','location','capturedAt','excerpt','status'].every(k=>typeof c[k]==='string'));
        outcome.unknownCount=Array.isArray(data.unknowns)?data.unknowns.length:null;
      }
      item[label]=outcome;
    } catch (error) { item[label]={errorClass:error.name}; }
  }
  results.push(item);
}
console.log(JSON.stringify({at:new Date().toISOString(),results,limits:'LiT checks a deliberately nonexistent manuscript scope; no manuscript content is requested. No model or mutation endpoint is called.'},null,2));
