# Daily Operator Loop — Presence OS + MSP + NetOps

**Living checklist.** Merges content Presence (ME Manager), MSP (`Dashboard/docs/DAILY-TASKS.md`), and NetOps Journey 1 (`Future Ideas/netops-tool/docs/APPLICATIONS_SUITE.md`).  
**Do not treat any single older PDF/checklist as complete alone.**

Canonical Presence hub: https://me.willworkforlunch.com  
`siteKey`s: `wwfl` · `kecktech` · `jacob-roman` · **`unclejon`** (never `uncle-jons`)

Chronic-pain protocol: never skip P1 tickets, lead replies, or fleet fires; content can shrink.

---

## Every business day (60–90 min fixed ops, then deep work)

### Block 0 — Briefing (~2 min)

1. Read n8n morning briefing email (Zammad / ERP / TRMM summary) — https://n8n.kecktech.net

### Block A — MSP ops trio (~10–15 min)

1. https://dash.kecktech.net — Today / red tiles  
2. https://tickets.kecktech.net — P1/P2 first, then open queue  
3. https://rmm.kecktech.net — critical alerts / offline agents → ticket if needed  
4. https://erp.kecktech.net — overdue invoices / CRM follow-ups (stub leads OK at zero clients)  
5. OWA `support@kecktech.net` + brand aliases — log leads in ERPNext  

### Block B — NetOps / Cleaner Quality (REQUIRED, ~10–15 min)

Live host: **https://net-ops.kecktech.net** (not `netops` without hyphen). Authelia; break-glass `/login`.

1. `/dashboard` — “What needs you”: blocked apps, open issues, Cleaner review, agents down  
2. `/dashboard/issues` — alerts + security tasks + degraded agents/containers  
3. `/dashboard/cleaner?tab=inbox` (prefer Apps → Quality) — Accept/Dismiss until **`pending_high` = 0** (HIGH/CRITICAL only) or park with note  
4. `/dashboard/fleet/agents` if pulse shows agents down  
5. `/dashboard/security` only if chips hot (else weekly)  

Prefer NetOps Quality over standalone https://cleaner.kecktech.net (repo Quality tool — not cleaning services).

### Block C — Capture & approve (ME Manager, ~15–25 min)

1. https://me.willworkforlunch.com → Pipeline/Inbox  
2. Process **every** awaiting item (all personas): edit → Approve / Hold / Reject  
3. Destinations: explicit multi-select of `wwfl` · `kecktech` · `jacob-roman` · `unclejon` (or Coordinator wizard at `/pipeline/wizard`) — do **not** rely on tech-only “both” for author/garage  
4. Calendar — today’s scheduled posts  
5. Optional: `/pipeline/wizard` Health tile — four-site bridge pulse 

### Block D — Progress intake (~10–20 min)

1. Coding today → Ship/hook with correct `targets.site`  
2. LiT / bible session → `jacob-roman` package or explicit skip ([LIT-SHIP.md](../../../me-manager/docs/guides/LIT-SHIP.md))  
3. Demo change → Ship to `kecktech` and/or `wwfl`  
4. https://forge.kecktech.net Studio queue — approve/send-back (Jon-only)  
5. https://gpu.kecktech.net — only if jobs stuck  

### Block E — Property + demo pulse

| Surface | Daily pulse |
|---------|-------------|
| Kecktech | Inbox + `/demos` accuracy + lead mail |
| WWFL | Inbox + Projects feel current |
| Jacob | Inbox/LiT + contact; never tech “both” |
| Uncle Jon’s | Forge + game commits; Games + Discord when live |
| NetOps/Cleaner | Issues not on fire; `pending_high` cleared or parked |
| Portfolio demos | Spot-check any app you touched; Capture if UI changed |

### Evening wrap (5–10 min)

- Inbox + NetOps fire + P1 tickets cleared or explicitly parked  
- Unbilled hours / ERP lead statuses if any client work  
- Tomorrow’s top 3 across: client / fleet / presence / demo / game / book  

---

## Weekly (90–120 min)

1. Portfolio Sync — `POST /api/portfolio` `{ "action": "sync" }` — then **verify** https://www.kecktech.net/demos still shows only the marketing allowlist (see [DEMOS_MSP.md](./DEMOS_MSP.md)); rebuild Astro if demos.json changed  
2. NetOps: AppSec for critical apps; Cleaner coverage drain; inventory hygiene vs RMM + Vault names  
3. Sovereign Hub glance (export-fed — not a NetOps substitute)  
4. Sources & Outputs + Postiz health (LAN `10.20.0.205:4007`)  
5. One post each stream or explicit skip: Kecktech, WWFL, Jacob, Uncle Jon  
6. Umami (https://umami.kecktech.net / stats) + social → pivot note  
7. Traefik / Portainer if flaky; n8n failed runs; Mailcow monthly if due  
8. Voice-clone upload if new audio; MSP outreach (5 CRM enrichments while zero clients)  
9. Forge backlog empty or prioritized  
10. Portal Stripe readiness check while zero clients (no fake invoices)  
11. Coordinator wizard Health (`/pipeline/wizard`) — bridges green for all four siteKeys  

---

## Full tool inventory

### A. Content / presence

| Tool | URL | Cadence |
|------|-----|---------|
| ME Manager | me.willworkforlunch.com | Daily |
| Postiz | 10.20.0.205:4007 | Weekly |
| Asset Forge | forge.kecktech.net | Daily queue |
| GPU Broker | gpu.kecktech.net | As needed |
| Voice clone | ME `/voice-clone` | Trigger |
| Lost in Thought | lostinthought.kecktech.net | Sessions |
| Astro CMS admin | admin.kecktech.net | Rare |
| Email onboard | dash.kecktech.net/ops/email-onboard | As needed |

### B. Fleet / Quality

| Tool | URL | Cadence |
|------|-----|---------|
| NetOps | net-ops.kecktech.net | **Daily** |
| Cleaner (standalone) | cleaner.kecktech.net | Prefer NetOps |
| TRMM | rmm.kecktech.net | Daily |
| Sovereign Hub/Session/API | sovereign-*.kecktech.net | Weekly |
| Claudette | claudette.kecktech.net | As needed |

### C. MSP / client

| Tool | URL | Cadence |
|------|-----|---------|
| n8n | n8n.kecktech.net | Daily briefing |
| Ops Dashboard | dash.kecktech.net | Daily |
| Zammad | tickets / support.kecktech.net | Daily |
| ERPNext | erp / ops.kecktech.net | Daily |
| Portal | portal.kecktech.net | Weekly readiness |
| Help | help.kecktech.net | As needed |
| Vault | vault.kecktech.net | As needed / monthly |
| LLDAP / Authelia | lldap / auth.kecktech.net | Weekly / breaks |
| RustDesk | rustdesk.kecktech.net | Scheduled remotes |
| Mailcow | mail.kecktech.net | Monthly / incidents |

### D. Demo / product apps (Portfolio SSOT)

FloorOS, Marketlist, AeroCAD, Argo, FarmBot, NetOps, Cleaner (Quality), Portal, Ops Dashboard, Claudette, Sovereign*, DebateForge (WIP), chat.kecktech.net

### E. Content properties

| Property | siteKey | URL |
|----------|---------|-----|
| Kecktech | `kecktech` | kecktech.net |
| WWFL | `wwfl` | willworkforlunch.com |
| Jacob Roman | `jacob-roman` | jacob-roman.com |
| Uncle Jon’s | `unclejon` | unclejonsitgarage.com |

### F. Infra glance

Traefik · Portainer · Umami/stats · Chat — weekly or incident

---

## Cadence map

| Stream | Daily | Weekly | Trigger |
|--------|-------|--------|---------|
| n8n briefing | Required | — | — |
| dash / Zammad / ERPNext | Required | Outreach | First client → Stripe |
| TRMM | Required | Patch/name vs NetOps | Agent down |
| NetOps Issues + Quality | **Required** | AppSec + hygiene | New flags |
| Cleaner `pending_high` | **via NetOps** | Drain | After merges |
| Brand mail | Required | — | Form submit |
| ME Inbox | Required | Deep review | — |
| Demos Portfolio | Pulse | Sync + Capture | Ship |
| WWFL / Jacob / Uncle Jon | Required/pulse | Post or skip | Ship / LiT / Forge |
| Asset Forge / GPU | Queue / as needed | Backlog | Stuck job |
| Voice clone | No | If audio | Train 45–90 min |
| Vault / LLDAP / RustDesk / portal / help | As needed | Hygiene | Onboarding / first client |

---

## Jon-only vs agent

| Jon-only | Agent / Cursor |
|----------|----------------|
| Forge Studio approvals | Site scaffolds, bridges, hooks, docs |
| Voice recording session | Chatterbox / train wiring |
| Prospect calls / cold email | ERPNext field prep, Ship automation |
| Inbox Approve (tone) | Draft generation — never auto-approve |
| NetOps Accept/Dismiss | Checklist + label fixes |

---

## Related docs

- [CLOSE_THE_GAPS_CHECKLIST.md](./CLOSE_THE_GAPS_CHECKLIST.md) — owners  
- [NETOPS_FLEET.md](./NETOPS_FLEET.md) — Journey 1 detail  
- [MONETIZATION_READINESS.md](./MONETIZATION_READINESS.md) — Stripe/portal before first invoice  
- [Dashboard/docs/DAILY-TASKS.md](F:/Github/Dashboard/docs/DAILY-TASKS.md) — MSP-only (incomplete alone)  
- [me-manager/docs/SITE_HOOKS.md](F:/Github/me-manager/docs/SITE_HOOKS.md)  
- [me-manager/docs/INVENTORY.md](F:/Github/me-manager/docs/INVENTORY.md)  
- Email ops: [ops/email/USER_ACTIONS.md](../email/USER_ACTIONS.md)  
