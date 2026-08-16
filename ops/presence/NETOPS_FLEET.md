# NetOps / Cleaner / fleet hygiene

Live: **https://net-ops.kecktech.net** (hyphen required). Repo: `F:/Github/Future Ideas/netops-tool`.

## Daily Journey 1 (canonical)

1. Home `/dashboard` — ops pulse (blocked apps · open issues · Cleaner review · agents down)  
2. Issues `/dashboard/issues` — alerts, security tasks, degraded agents/containers  
3. Quality inbox `/dashboard/cleaner?tab=inbox` or Apps → app → Quality tab  
4. Clear flags Accept/Dismiss until **`pending_high` = 0** (HIGH/CRITICAL only; low nits do not block)  
5. Fleet `/dashboard/fleet/agents` if pulse shows down  
6. Security `/dashboard/security` when chips hot  

Product path for quality: **NetOps → Applications → Quality** — standalone Cleaner (`cleaner.kecktech.net`) is secondary.

`pending_high` is written by Cleaner sync / quality run APIs (`APPLICATIONS_SUITE.md`). It is a metadata field, not a dedicated route.

## Parallel planes (do not merge code)

| Plane | Role |
|-------|------|
| NetOps | Apps, Quality, Issues, inventory export |
| TRMM `rmm.kecktech.net` | Agent offline / patch alerts |
| Zammad | Human ticket work |
| Sovereign Hub | Intelligence UI; inventory **from NetOps export only** |

## Weekly

- AppSec schedules for critical apps (~168h / `appsec_only` suite)  
- Cleaner coverage drain across apps  
- Inventory hygiene: naming reconcile vs RMM + Vaultwarden  
- Sovereign Hub glance  

## Doc corrections

| Stale | Correct |
|-------|---------|
| Wiki `netops.kecktech.net` | `net-ops.kecktech.net` |
| Cleaner = cleaning services | Repo Quality / cleanup |
| Content Daily Ops alone | Must include this NetOps block |

Encoded in [DAILY_OPERATOR_LOOP.md](./DAILY_OPERATOR_LOOP.md) Block B.
