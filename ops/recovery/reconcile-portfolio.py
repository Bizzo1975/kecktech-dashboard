"""Reconcile recorded coverage without claiming missing evidence is verified."""
import json,re,collections
from pathlib import Path
root=Path(__file__).parent
infra=Path('F:/Github/kecktech-infrastructure/inventory')
baseline=json.loads((root/'runtime-catalog-2026-09-15.json').read_text(encoding='utf-8-sig'))
cluster=json.loads((root/'cluster-membership-2026-09-16.json').read_text(encoding='utf-8-sig'))
rules=[('netops','NetOps'),('node_exporter','NetOps'),('portainer','Portainer'),('authelia','Identity'),('lldap','Identity'),('traefik','Ingress'),('vaultwarden','Vaultwarden'),('mailcow','Mailcow (retired)'),('mattermost','Mattermost'),('n8n','n8n'),('umami','Umami'),('rustdesk','RustDesk'),('argo-','Argo'),('lostinthought','Lost in Thought'),('open-webui','Open WebUI'),('sovereign','Sovereign'),('obs-','NetOps'),('erpnext','ERPNext'),('zammad','Zammad'),('trmm','TacticalRMM'),('marketlist','MarketList'),('kecktech-cms','Kecktech CMS'),('dashboard','Dashboard'),('kecktech-','Kecktech web services'),('custom-wiki','Wiki'),('farmbot','FarmBot'),('flooros','FloorOS'),('cleaner','Cleaner'),('mom-hub','Mom Hub'),('aerocad','AeroCAD'),('listmonk','Listmonk'),('personal-website','Personal Website'),('me-manager-postiz','Postiz'),('me-manager','Me Manager'),('jacob-roman','Pseudonymous site (isolated)'),('ratemyrack','RateMyRack'),('unclejons','Uncle Jon site'),('4af0d3b9-','Minecraft')]
native=[('claudette-','Retired Claudette cleanup'),('argo-','Argo'),('asset-forge','Asset Forge'),('gpu-','GPU Broker'),('ollama','Ollama'),('openwebui','Open WebUI'),('sovereign','Sovereign'),('conanexiles','Conan Exiles'),('plexmedia','Plex'),('pteroq','Pterodactyl'),('wings','Pterodactyl'),('cloudflared','Ingress')]
rows=[]
for item in baseline['runtimes']:
 row=dict(item); match=next((owner for prefix,owner in (rules if row['runtime']=='docker' else native) if row['name'].startswith(prefix)),None)
 row['applicationOwner']=match or ('Kecktech Operations' if row['runtime']!='docker' else 'Kecktech Operations — identification pending')
 row['ownershipEvidence']='Assigned from observed name and responsibility register; source/data dependency verification separate'
 row['scopeClass']='application' if match else ('host service/task; custom-purpose review pending' if row['runtime']!='docker' else 'unidentified application')
 rows.append(row)
groups=collections.defaultdict(list)
for r in rows:
 if r['runtime']=='docker' or r['scopeClass']=='application':groups[r['applicationOwner']].append(r)
apps=[]
for name,entries in sorted(groups.items()):
 lifecycle='active/intended; acceptance varies'
 if 'retired' in name.lower() or 'Retired' in name:lifecycle='retired; cleanup approval required'
 if name=='FarmBot':lifecycle='future unfinished tool — OPERATOR CONFIRMED'
 apps.append({'name':name,'accountableOperator':'Jon Keck','hosts':sorted(set(r['hostId'] for r in entries)), 'runtimeIds':[r['id'] for r in entries],'lifecycle':lifecycle,'sourceParity':'not_established','recoveryAcceptance':'not_established'})
text=(root/'FLEET_GIT_RECONCILIATION_PLAN_2026-09-15.md').read_text(encoding='utf-8-sig')
section=text.split('## Repository classes',1)[1].split('## High-risk findings',1)[0]
repos=[];classification=''
for line in section.splitlines():
 if line.startswith('### Class '):classification=line[4:]
 m=re.match(r'- `([^`]+)`',line)
 if m:repos.append({'pathOrName':m.group(1),'classification':classification,'reviewBasis':'September 15 Git audit','deploymentMapping':'unverified unless linked by application evidence'})
catalog={'schemaVersion':'1.1','reconciledAt':'2026-09-16','membershipEvidence':'cluster-membership-2026-09-16.json','runtimeEvidenceAt':baseline['capturedAt'], 'scope':'All captured runtimes plus current cluster membership; missing fields remain explicit, not full app certification', 'guests':cluster,'applications':apps,'runtimes':rows,'repositoryCandidates':repos,'operatorDecisions':{'hostCrashCause':'Full storage pool followed by failed NIC — OPERATOR CONFIRMED September 16; removed from active investigation','piBuilds':'Operator in progress','erpnextData':'No customer/client data — OPERATOR CONFIRMED','vm400':'Minecraft game server','farmbot':'Future unfinished tool'},'openEvidence':['Stopped guest interiors and cron/task coverage','Per-service source/image parity and actual dependency/consumer contracts','Unidentified great_hermann container on VM302','Remote-only repository contents and deployment linkage','Authenticated user journeys and restore acceptance']}
(infra/'fleet-portfolio-2026-09-16.json').write_text(json.dumps(catalog,indent=2)+'\n')
q=json.loads((root/'phase-b-queue-review-2026-09-16.json').read_text(encoding='utf-8-sig'))
functions=[f for f in q['functionReferences'] if f not in ['frappe.core.doctype.scheduled_job_type.scheduled_job_type.run_scheduled_job','frappe.utils.background_jobs.execute_job']]
assert len(functions)==56
categories=collections.defaultdict(list)
for f in functions:
 if any(x in f for x in ['email','send_hourly','send_weekly','reminder','collect_project_status']):cat='Email / notifications / project requests'
 elif any(x in f for x in ['depreciation','accounts.','post_gl','subscription','repost_item','reorder_item','auto_repeat']):cat='Accounting / recurring transactions / stock'
 elif any(x in f for x in ['deletion','delete_','clean_up','clear_expired','clear_notifications','remove_unverified']):cat='Cleanup / deletion / session maintenance'
 elif any(x in f for x in ['plaid','youtube','fetch_changelog','check_for_update']):cat='External synchronization / update checks'
 else:cat='Internal status / maintenance'
 categories[cat].append({'function':f,'label':f.split('.')[-1].replace('_',' '),'count':q['functionReferences'][f]})
out=['# ERPNext — all 56 queued functions','', 'Operator confirmed no customer/client data. These are scheduled functions, not 56 customer transactions. Counts reflect the recorded September 16 queue inspection; no jobs have been run or deleted. Shared dispatcher wrappers are excluded from this list.', '', 'Recommendation: retain the backlog until schedules and integrations are configured. The absence of client data reduces business impact, but does not prove there are no internal records, email recipients, API integrations or cleanup targets. Review the email, financial, deletion and external-sync groups before enabling workers.']
for cat,items in categories.items():
 out+=['','## '+cat+' ('+str(len(items))+')','']
 for i in items:out+=['- **'+i['label']+'** — `'+i['function']+'`']
(root/'ERPNEXT_QUEUED_JOBS_2026-09-16.md').write_text('\n'.join(out)+'\n')
(root/'erpnext-job-groups-2026-09-16.json').write_text(json.dumps(categories,indent=2))
print(json.dumps({'clusterEntities':len(cluster),'guests':sum(not g.get('template') for g in cluster),'runtimeRecords':len(rows),'dockerRecords':sum(r['runtime']=='docker' for r in rows),'applicationGroups':len(apps),'repositoryCandidateRows':len(repos),'jobs':sum(len(v) for v in categories.values()),'unidentifiedDocker':[r['id'] for r in rows if r['scopeClass']=='unidentified application']}))
