// Fail closed before starting the proposed Linux read-only pilot.
import {stat, access, realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {config,validateConfig} from '../dist/config.js';
validateConfig();
if(process.platform!=='linux') throw new Error('This deployment targets Linux');
if(process.versions.node!=='24.19.0') throw new Error('Reviewed Node runtime 24.19.0 required');
if(config.sovereignWriteKey || config.litWriteKey) throw new Error('Pilot requires domain write keys omitted');
if(config.cloudAllowed || config.gpuBrokerUrl || config.gpuBrokerKey) throw new Error('Pilot requires model execution disabled');
if(!process.env.NEXUS_ASSISTANT_REPO_ROOTS) throw new Error('Explicit Linux repository allowlist required');
for(const root of config.repositoryRoots){
  if(!path.isAbsolute(root) || !root.startsWith('/srv/nexus/repos/')) throw new Error('Repository must be in reviewed snapshot directory');
  if(await realpath(root)!==root || !(await stat(root)).isDirectory()) throw new Error('Repository snapshot path invalid');
  await access(root,constants.R_OK);
}
for(const endpoint of [config.sovereignUrl,config.litUrl]){
  if(!endpoint || !['http:','https:'].includes(new URL(endpoint).protocol)) throw new Error('Both domain endpoints required');
}
if(path.dirname(config.dataFile)!=='/var/lib/nexus-assistant') throw new Error('Persistent state directory mismatch');
console.log('Nexus pilot configuration preflight passed');
