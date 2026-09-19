// Existing read credentials travel through SSH stdin only; never print values.
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
const env=parseEnv(await readFile('F:/Github/nexus/apps/assistant-api/.env','utf8'));
const packet=['SOVEREIGN','LIT'].map(prefix=>({name:prefix,url:env[`${prefix}_ASSISTANT_URL`],key:env[`${prefix}_ASSISTANT_READ_KEY`]}));
if(process.argv.includes('--verified-lan')) {
  packet[0].url='http://10.20.0.122:8200';
  packet[1].url='http://10.20.0.115:8202';
}
if(packet.some(p=>!p.url||!p.key)) throw new Error('Existing read configuration incomplete');
const script=`import base64,json,urllib.request,urllib.error,datetime
items=json.loads(base64.b64decode('${Buffer.from(JSON.stringify(packet)).toString('base64')}'))
results=[]
for item in items:
    body={'text':'Which VMs are running?','projectSlug':'kecktech-ops','limit':2} if item['name']=='SOVEREIGN' else {'text':'readiness verification','manuscriptId':'nexus-readiness-nonexistent-scope','limit':1}
    result={'domain':item['name']}
    try:
        req=urllib.request.Request(item['url']+'/v1/evidence/query',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-api-key':item['key']},method='POST')
        with urllib.request.urlopen(req,timeout=12) as response:
            data=json.load(response)
            result.update(status=response.status,citationCount=len(data.get('citations',[])),hasUnknowns=bool(data.get('unknowns')),contractShape=all(isinstance(data.get(k),list) for k in ['citations','unknowns','contradictions']))
    except urllib.error.HTTPError as error: result['status']=error.code
    except Exception as error: result['errorClass']=type(error).__name__
    results.append(result)
print(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':'VM125','results':results}))
`;
const proc=spawnSync('C:/Program Files/Git/usr/bin/ssh.exe',['-i','C:/Users/jonkd/.ssh/id_ed25519','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','kecktech@10.20.0.125','python3 -B -'],{input:script,encoding:'utf8',timeout:35000});
if(proc.status!==0) throw new Error('SSH read-contract check failed; details suppressed');
const result=JSON.parse(proc.stdout);
console.log(JSON.stringify(result,null,2));
