# Games pipeline — Uncle Jon Portfolio + Ship + Forge

## Portfolio (ME Manager)

Seed now includes (siteKey display `unclejon`, stage `running_dev`):

| Slug | Repo |
|------|------|
| `uncle-jons-it-garage` | `F:/Github/unclejons-itgarage-site` |
| `twisted-tavern` | `F:/Github/twisted tavern` |
| `how-dare-you-sir` | `F:/Github/how-dare-you-sir` |
| `squirrel-commander` | `F:/Github/squirrel-mobile-game` |

After deploy of seed/upsert: run Portfolio Sync from ME Manager UI, or:

```http
POST https://me.willworkforlunch.com/api/portfolio
{ "action": "sync" }
```

## Ship hooks

Each game repo has `scripts/me-manager-ship.ps1` posting to `/api/events/ship` with `"targets": { "site": "unclejon" }`.

Install git post-commit (from me-manager, pointing at a game repo — or run the ps1 manually after meaningful commits):

```powershell
cd F:\Github\me-manager
# Prefer manual ship from game repo until hooks are trusted:
cd "F:\Github\twisted tavern"
.\scripts\me-manager-ship.ps1 -Summary "Describe the change"
```

Requires `ME_MANAGER_INGEST_KEY` and optional `ME_MANAGER_URL` (default https://me.willworkforlunch.com).

## Forge loop (Jon-only approve)

1. Open https://forge.kecktech.net Studio  
2. Approve or send-back waiting requests (historically `8b14b38e9cc7`, `1c189b83ca9e`)  
3. After delivery, run ship with `mediaUrls` so art becomes Inbox content for `unclejon`  

Agents never auto-approve Forge Studio.
