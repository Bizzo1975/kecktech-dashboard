import json
from pathlib import Path
root=Path(__file__).parent
c=json.loads(Path('F:/Github/kecktech-infrastructure/inventory/fleet-portfolio-2026-09-16.json').read_text())
j=json.loads((root/'erpnext-job-groups-2026-09-16.json').read_text())
data={'apps':c['applications'],'jobs':[dict(item,category=category) for category,items in j.items() for item in items],'repos':c['repositoryCandidates']}
source='''import {useState,useHostTheme,Stack,H1,H2,Text} from "cursor/canvas";
const data=__DATA__;
export default function Portfolio(){
 const t=useHostTheme();const [query,setQuery]=useState("");const [view,setView]=useState("Jobs");
 const q=query.toLowerCase();const jobs=data.jobs.filter(x=>(x.label+" "+x.function+" "+x.category).toLowerCase().includes(q));
 const apps=data.apps.filter(x=>(x.name+" "+x.hosts.join(" ")).toLowerCase().includes(q));
 const repos=data.repos.filter(x=>(x.pathOrName+" "+x.classification).toLowerCase().includes(q));
 const cell={padding:"10px 8px",borderBottom:`1px solid ${t.stroke.primary}`,textAlign:"left" as const,verticalAlign:"top" as const};
 return <Stack gap={18} style={{padding:24,color:t.text.primary,background:t.bg.editor}}>
 <H1>Kecktech fleet & AI portfolio</H1>
 <Text>September 16, 2026 · 36 guests + 1 template · 212 captured containers · 43 application/service groups</Text>
 <section><H2>Decisions now recorded</H2><p>Crash cause: full storage pool followed by failed NIC (operator confirmed). Pi builds: operator in progress. Minecraft: VM400. FarmBot: future unfinished tool. ERPNext: no customer/client data.</p><p>Sovereign alert jobs fail when a DateTime reaches JSON serialization. Sovereign and LiT publish the exact evidence/execution contracts. Nexus VM125 has no app deployed; Ollama has no models installed.</p></section>
 <section><H2>Use each system once</H2><p>Nexus coordinates → Sovereign owns operations evidence / LiT owns fiction → GPU Broker admits compute → Ollama executes. NetOps observes; Dashboard presents; Notion records human decisions. ERPNext owns business records, Zammad tickets, TacticalRMM devices. Me Manager coordinates content; Postiz delivers social posts. n8n owns cross-app integrations; each app owns its internal workflows and data.</p></section>
 <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{["Jobs","Applications","Repositories"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"8px 14px",background:view===v?t.fill.secondary:t.bg.editor,color:t.text.primary,border:`1px solid ${t.stroke.primary}`}}>{v}</button>)}<input aria-label="Search portfolio" placeholder="Search names, host IDs or job functions" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1,minWidth:230,padding:8,color:t.text.primary,background:t.bg.editor,border:`1px solid ${t.stroke.primary}`}}/></div>
 {view==="Jobs"&&<section><H2>All 56 queued ERPNext functions</H2><Text>No jobs executed or deleted. No client data reduces risk; internal records, email configuration and external integrations still matter. Groupings describe potential effects, not proof each job has work to do.</Text><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Potential effect","Function","Count"].map(h=><th key={h} style={cell}>{h}</th>)}</tr></thead><tbody>{jobs.map(x=><tr key={x.function}><td style={cell}>{x.category}</td><td style={cell}><strong>{x.label}</strong><div style={{fontSize:12,color:t.text.secondary,overflowWrap:"anywhere"}}>{x.function}</div></td><td style={cell}>{x.count}</td></tr>)}</tbody></table></section>}
 {view==="Applications"&&<section><H2>Captured application/service groups</H2><Text>Assigned operational accountability: Jon Keck. Runtime observations are from September 15; later recovery records supersede ERPNext/Umami states. Source parity and restore acceptance remain explicitly unverified. Guest-only roles and stopped guests are in the canonical JSON.</Text><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Group","VM/LXC","Lifecycle","Runtime entries"].map(h=><th key={h} style={cell}>{h}</th>)}</tr></thead><tbody>{apps.map(x=><tr key={x.name}><td style={cell}>{x.name}</td><td style={cell}>{x.hosts.join(", ")}</td><td style={cell}>{x.lifecycle}</td><td style={cell}>{x.runtimeIds.length}</td></tr>)}</tbody></table></section>}
 {view==="Repositories"&&<section><H2>Repository audit classifications</H2><Text>81 classification rows, not 81 apps. Some repositories appear in multiple classes. Source: September 15 Git audit (68 GitHub repos, 60 local Git directories, 17 remote-only). Deployment mapping remains unverified unless separately evidenced.</Text><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>{repos.map((x,i)=><tr key={i}><td style={cell}>{x.pathOrName}</td><td style={cell}>{x.classification}</td></tr>)}</tbody></table></section>}
 <Text>Evidence: fleet-portfolio-2026-09-16.json; phase-b-queue-review-2026-09-16.json; September 16 hypervisor and API deltas. This is a portfolio review, not complete application or restore certification. No retirement, migration, publication or production change is implied.</Text>
 </Stack>;
}
'''.replace('__DATA__',json.dumps(data,ensure_ascii=False))
target=Path('C:/Users/jonkd/.cursor/projects/f-Github-kecktech-dashboard/canvases/fleet-AI-portfolio.canvas.tsx')
target.write_text(source,encoding='utf-8')
print(str(target))
