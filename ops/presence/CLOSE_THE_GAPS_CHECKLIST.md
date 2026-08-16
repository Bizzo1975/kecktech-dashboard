# Close-the-Gaps — status after closeout (daily-only)

Setup cutover is **done**. This file is a status snapshot, not a setup backlog.

| Item | Status |
|------|--------|
| Uncle Jon marketing live (`www` + apex) | **Done** — VM 401 `:3006`, Traefik + tunnel |
| CtrlPanel on `panel.` | **Done** — https://panel.unclejonsitgarage.com |
| ME `unclejon` bridge + `cmsEnabled` | **Done** |
| Jacob novel concept teasers | Ship to Inbox drafts → **Approve/schedule daily** |
| Jacob `/about` + `/contact` | **Done** — live on jacob-roman.com (VM 304) |
| Games Portfolio + Ship hooks | Ready — use in Forge/Games daily pulse |
| Forge Studio approve | **Daily** (Jon-only) |
| Voice record 45–90 min + train | **Session workflow** (Voice PDF); SoVITS may be simulated until `GPT_SOVITS_TRAIN_CMD` set |
| Inbox Approve / NetOps Accept-Dismiss | **Daily** (Jon-only) |
| Discord / Roblox URLs | Placeholders — update when ready (content pulse) |
| Stripe / first client | Monetization gate only |

## Operator entry

Open **`ops/presence/pdf/Daily_Operator_Guide.pdf`** and follow Blocks 0–E.

Regenerate PDFs: `python ops/presence/generate-presence-pdfs.py`

Root `Daily_Operations_Guide.pdf` / `Close_the_Gaps_Operator_Guide.pdf` are **SUPERSEDED**.
