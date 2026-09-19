import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
const env=parseEnv(await readFile('F:/Github/nexus/apps/assistant-api/.env','utf8'));
const keys=['NEXUS_ASSISTANT_OPERATOR_TOKEN','SOVEREIGN_ASSISTANT_READ_KEY','LIT_ASSISTANT_READ_KEY'];
const values=Object.fromEntries(keys.map(k=>[k,env[k]]));
if(keys.some(k=>!values[k]))throw new Error('Existing credentials incomplete');
const result=spawnSync('C:/Program Files/Git/usr/bin/ssh.exe',['-i','C:/Users/jonkd/.ssh/id_ed25519','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','kecktech@10.20.0.125','sudo -n python3 -B /home/kecktech/.cache/nexus-pilot-20260917/install.py'],{input:JSON.stringify(values),encoding:'utf8',timeout:180000});
// Installer emits only sanitized acceptance results. Never echo stderr/inputs.
if(result.stdout.trim())console.log(result.stdout.trim());
if(result.status!==0){console.error('Approved installation did not pass; inspect sanitized remote evidence.');process.exit(1);}
