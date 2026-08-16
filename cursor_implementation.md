# Presence OS — Gap Closure Implementation Spec

**Audience:** Cursor (or any coding agent) working directly in `F:\Github`.
**Source of truth:** every contract below was read directly out of the existing repos —
`me-manager/docs/SITE_HOOKS.md`, `me-manager/docs/EVENTS.md`, `me-manager/docs/INVENTORY.md`,
`me-manager/docs/COST_MODEL.md`, `personal-website-gen`, `kecktech-dashboard`, `psuedonym-site`,
and the three game repos. Where something could not be confirmed from the code, it is marked
**CONFIRM** — resolve that before building on top of it, don't guess.

**Non-negotiable ground rule:** ME Manager (Presence OS) already exists and works. Nothing in
this spec proposes a new pipeline, a new CMS pattern, or a new posting mechanism. Every task
below either (a) extends the existing pattern to a new site, or (b) finishes an existing,
partially-built feature. If a task in this file looks like it's inventing new architecture,
stop and re-read `me-manager/docs/` first — the pattern almost certainly already exists.

---

## 0. Before touching anything: two confirmations

### 0.1 Kecktech repo — which one is canonical?

**RESOLVED (Aug 2026):** Both trees are required for different roles — do **not** archive the CMS.

- **Marketing HTML (canonical public site):** `F:\Github\kecktech-dashboard\dashboard\website` → live `/opt/docker/dashboard/website` — see `CANONICAL.md`
- **Blog JSON + ME Manager CMS API:** `F:\Github\kecktech\Kecktech\website` → `/opt/docker/kecktech-cms` `:8085` — see companion `CANONICAL.md`

### 0.2 Jacob Roman — is the internal admin work still needed?

**RESOLVED:** NextAuth + BullMQ are implemented; ME Manager bridge is the primary publish path. `REMAINING_TASKS.md` marks those items SUPERSEDED. Rich-text editor remains optional quality.

### 0.3 Jacob Roman contact + about

**RESOLVED in repo:** `/about` author copy + `/contact` + Graph API route live in `Running Apps/psuedonym-site`. Deploy to jacob host if not already shipped. Tone stays reader/press facing.

---

## 1. Build the Uncle Jon's IT Garage site

### 1.1 Scaffold

```
Source repo to fork: F:\Github\personal-website-gen
New repo:            F:\Github\unclejons-itgarage-site
```

Fork rather than build from scratch. Keep:
- Header/Footer/Card/Button component library (`src/components/`)
- The Blog + admin CMS pattern (`src/app/admin`, `src/app/(main)/blog`)
- The Projects pattern (`src/app/(main)/projects`) — repurpose as **Games**
- `src/lib/me-manager-teaser.ts` — this is the integration point, keep as-is
- `src/lib/auth-config.ts`, `src/lib/db.ts` — same auth/DB pattern as WWFL

Strip: WWFL-specific copy, branding, theme colors, newsletter content specific to Jon's
personal voice (keep the newsletter *mechanism*, replace the copy).

### 1.2 Page structure (must match this exactly — it's deliberately aligned to WWFL/Kecktech)

| Route | Source pattern | Notes |
|---|---|---|
| `/` | WWFL `home-page.tsx` | Hero for 3 games + latest devlog teaser |
| `/games` | WWFL `/projects` (index) | Card grid, one per game — see platform note below |
| `/games/[slug]` | WWFL `/projects/[slug]` or `/[slug]` | One page per: `twisted-tavern`, `how-dare-you-sir`, `squirrel-commander` |
| `/devlog` | WWFL `/blog` | Same CMS-backed blog pattern, renamed |
| `/devlog/[slug]` | WWFL `/blog/[slug]` | |
| `/community` | New | Discord invite embed + playtest signup form |
| `/about` | WWFL `/about` | Studio story; must clearly distinguish this identity from WWFL/Kecktech in copy |
| `/privacy-policy` | WWFL `/privacy-policy` | Required — Discord/email collection on `/community`, plus App/Play Store listing requirements for the two Unity titles |
| `/contact` | WWFL `/contact` + `/api/contact` | **Do not build a new contact mechanism** — copy WWFL's `/api/contact` route wholesale (see repo is already forked from `personal-website-gen`, so this is inherited by default, not new work) |

**Platform note — corrects an earlier assumption:** only `twisted-tavern` is a Roblox game.
`how-dare-you-sir` and `squirrel-commander` have both pivoted to standalone Unity 6 builds
(Android/iOS/Windows/Steam), with their Roblox versions archived as `legacy/roblox/`
reference-only in each repo. Each `/games/[slug]` page's CTA must reflect this:
- `twisted-tavern` → "Play on Roblox" linking to the live Roblox place
- `how-dare-you-sir`, `squirrel-commander` → "Coming to iOS / Android / Steam" (no Roblox
  link — the Roblox build is archived, not shippable)

### 1.3 ME Manager bridge — implement exactly this contract

Copy the API route implementations from `personal-website-gen/src/app/api/` (the routes
backing WWFL's bridge) into the new repo's `src/app/api/me-manager/`. Do not redesign the
contract — it must match byte-for-byte so ME Manager doesn't need any special-casing:

```
GET    /api/me-manager/posts                    → list posts
GET    /api/me-manager/posts/:id                 → get post (full content)
POST   /api/me-manager/posts                     → create draft
PATCH  /api/me-manager/posts/:id                 → update
POST   /api/me-manager/posts/:id/schedule        → schedule publish
POST   /api/me-manager/posts/:id/publish         → publish + fire teaser callback to ME Manager
GET    /api/me-manager/projects                  → list games (Portfolio bridge)
GET    /api/me-manager/projects/:id              → get one game
PATCH  /api/me-manager/projects/:id              → update game entry
POST   /api/cron/scheduler                       → (Bearer CRON_SECRET) publish due scheduled posts + fire teaser
```

Env vars on the new site (`.env`):

```
ME_MANAGER_API_KEY=<new key — see 1.4>
ME_MANAGER_URL=https://me.willworkforlunch.com
ME_MANAGER_INGEST_KEY=<matches me-manager's ME_MANAGER_INGEST_KEY>
CRON_SECRET=<new random secret>
NEXT_PUBLIC_SITE_URL=https://www.unclejonsitgarage.com
```

### 1.4 Register the new persona in ME Manager

In `me-manager` (not the new site repo):

1. Add a new site/property with `siteKey: "unclejon"` to the Properties config
   (same table that holds `wwfl`, `kecktech`, `jacob-roman` — Property Prisma model;
   upsert script: `me-manager/scripts/upsert-unclejon-persona.ts`).
2. Generate a new API key pair — add `UNCLEJON_CMS_API_KEY` to me-manager's env,
   matching the pattern of `WWFL_CMS_API_KEY` / `KECKTECH_CMS_API_KEY`.
3. Add a default Brand Voice for the persona (playful/scrappy tone) and connect it to a
   Postiz account for YouTube, Discord, and TikTok.
4. Test: `POST /api/events/ship` with `"targets": {"site": "unclejon"}` (see payload
   shape in §3) and confirm a draft lands in Pipeline/Inbox tagged to the new persona.

### 1.5 CtrlPanel relocation

The domain currently serves CtrlPanel (game-server billing panel) at the root — this must
move to a subdomain, not be removed.

1. Add DNS: CNAME `panel.unclejonsitgarage.com` → same Cloudflare Tunnel target CtrlPanel
   currently uses.
2. Add a Traefik ingress rule routing `panel.unclejonsitgarage.com` → CtrlPanel's existing
   internal service address. Do not modify CtrlPanel itself.
3. Deploy the new site from §1.1–1.3, confirm it works end-to-end.
4. Cut the root domain's ingress rule over from CtrlPanel to the new site.
5. Verify `panel.unclejonsitgarage.com` still reaches billing correctly before considering
   this done — existing customers/invoices may reference the old root-domain login URL.

### 1.6 Hosting

Host on a small VM behind the same shared Traefik/Cloudflare Tunnel as the other sites —
match the existing pattern (e.g. Jacob Roman's dedicated host at `10.20.0.206`) rather than
improvising a different deployment shape. **CONFIRM** which VM slot to use — check Proxmox
for the next available low-numbered VMID following the pattern in
`me-manager/docs/PROXMOX_DEPLOYMENT.md`.

---

## 2. Put the three games in the pipeline

### 2.1 Portfolio registration

For each of `twisted tavern`, `how-dare-you-sir`, `squirrel-mobile-game`, add a Portfolio
entry via ME Manager's Portfolio API or UI:

```json
{
  "name": "Twisted Tavern",
  "stage": "running_dev",
  "displaySites": ["uncle-jons"]
}
```

(Repeat for the other two, using their real names.) Source the description/hero image from
each game's existing `web/index.html` and `web/captures/` — this content already exists.

Run sync after adding entries:

```
POST /api/portfolio
{ "action": "sync" }
```

### 2.2 Ship hooks per game repo

Each game repo is a normal git repo. Install the existing hook mechanism:

```bash
# from each game repo root
npm run ship:install-hook   # if the repo has package.json scripts wired for it
```

If a game repo isn't an npm project in the relevant sense (check — Twisted Tavern and How
Dare You Sir both have `package.json` at root per their listings, so this likely works
directly), install the post-commit hook manually per the pattern in
`me-manager/docs/guides/` — **CONFIRM** exact guide filename before assuming.

Default hook config per repo:

```json
{
  "source": "cursor",
  "targets": { "site": "uncle-jons" }
}
```

### 2.3 Ship event payload reference (exact contract — do not deviate)

```
POST http://localhost:3010/api/events/ship
Authorization: Bearer <ME_MANAGER_INGEST_KEY>
Content-Type: application/json
```

```json
{
  "title": "Shipped new tavern brawl mechanic",
  "summary": "Server-authoritative combat pass, cosmetic drops wired",
  "repoPath": "F:/Github/twisted tavern",
  "liveUrl": null,
  "changelog": "optional — triggers tech-blog-style drafts",
  "userFacing": true,
  "source": "cursor",
  "sourceRef": "<commit-sha>",
  "targets": { "site": "uncle-jons", "social": ["youtube", "discord", "tiktok"] },
  "mediaUrls": ["F:/Github/twisted tavern/web/captures/latest.png"],
  "scheduleSiteAt": null,
  "suggestedSocialAt": null,
  "siteCampaignKey": "uncle-jons"
}
```

Notes:
- `mediaUrls` accepts local relative/absolute paths (e.g. Playwright or in-game captures) —
  first one becomes the CMS featured image.
- `userFacing: true` matters for games — it signals reader/player-understanding framing,
  same as it does for Jacob Roman's novel content, vs. `changelog`, which is dev-facing.
- Duplicate `sourceRef` is deduped automatically — safe to re-run on retry.

### 2.4 Asset Forge output

**Do not automate around the Studio approval step — it's deliberate, not a bug.**
`how-dare-you-sir` and `squirrel-commander` both already have live Asset Forge requests
sitting in the Studio queue: `8b14b38e9cc7` (How Dare You, full replace-all suite) and
`1c189b83ca9e` (Squirrel Commander, Forge keep-set). Neither produces final art until a
human reviews and approves the request at forge.kecktech.net — that's Jon's task, not
Cursor's. Once approved, the Orchestrator runs the Hunyuan3D/ComfyUI/Blender/audio workers
and delivers into each game's home repo automatically per Asset Forge's existing design —
do not rebuild any part of that chain.

The only code task here: after a Forge delivery lands in a game repo (i.e. after Jon
approves), fire a Ship event (§2.3) with the delivered asset's export path in `mediaUrls`,
so delivered art automatically becomes visible content instead of sitting unannounced in
the repo. Add this as a small watcher/hook on the repo's asset directory, or a manual
`npm run ship` invocation documented in each game's README — either is fine, but it must
not require Jon to write a social post by hand every time Forge delivers something.

---

## 3. Voice cloning — finish training, not build the service

**Correction from an earlier version of this spec:** the voice-clone build plan has
already been executed as real, running code. Do not treat this as a from-scratch build.

```
Repo:    F:\Github\voice-clone-service
Status:  Live FastAPI service on the RTX 3090 (start via scripts\start.ps1)
Target:  Fine-tuned GPT-SoVITS voice "jon-v1" + zero-shot Chatterbox fallback
```

**What's actually built (verified in repo):**
- Full API: `GET /health`, `GET /voices`, `POST /synthesize`, `POST /unload`,
  `POST /dataset/upload`, `GET /dataset/status`, `POST /train`, `GET /train/status`
- GPU Broker client already wired (`gpu_broker_client.py`)
- ME Manager integration already wired — dataset upload happens through ME Manager's
  `/voice-clone` UI, which calls `/dataset/upload` on this service
- Auth: `Authorization: Bearer <VOICE_CLONE_API_KEY>`

**What's actually NOT done:**
- `dataset/` contains only 2 short clips — the service's own README states a 45–90 minute
  target for a usable fine-tune. This is nowhere close.
- `models/jon-v1/` exists but is empty — no training run has ever completed.
- Real Chatterbox (`chatterbox-tts` package) is likely not installed in the service's
  `.venv` — without it, `/synthesize` intentionally returns a placeholder WAV (this is
  documented, deliberate behavior for offline pipeline development, not a bug).

**Task order:**
1. `pip install chatterbox-tts` inside `voice-clone-service/.venv` — unblocks the
   zero-shot path immediately, no dataset required for this part.
2. **CONFIRM** whether `GPT_SOVITS_TRAIN_CMD` in the service's `.env` already points at a
   real training command or is still unset/simulated — do not assume either way.
3. Once real training audio exists (a Jon task — studio recording session, not a code
   task), confirm `/dataset/status` reflects the real minute count, then trigger
   `POST /train` and poll `GET /train/status`.
4. Once `jon-v1` reports ready, add it to Video Studio's narration provider list
   alongside the existing espeak-ng fallback — **do not remove espeak-ng**, it's the
   documented "never a fake render" fallback per `COST_MODEL.md`.
5. Add `voice-clone-service` to the Integrations Catalog as **Free** (fully local, no
   recurring cost) once step 4 is confirmed working end-to-end.

---

## 4. Acceptance criteria (use this to confirm each workstream is actually done)

| Workstream | Done when |
|---|---|
| §0.1 Kecktech repo | Non-canonical repo is renamed/archived; a comment or README note in the canonical repo states which one is authoritative |
| §0.2 Jacob Roman admin | `REMAINING_TASKS.md` items are explicitly marked superseded or confirmed still-needed — no ambiguous TODOs left |
| §0.3 Jacob Roman contact | `/api/contact` route exists and delivers mail; `/about` has real copy, not the placeholder string |
| §1 Uncle Jon's site | All 9 routes in §1.2 return real content; `/api/me-manager/posts` responds correctly to a live ME Manager request; CtrlPanel reachable at the new subdomain; root domain serves the new site; each game's CTA matches its real platform (Roblox vs. Unity/App-Store) |
| §1.4 New persona | A test `ship` event with `"site": "uncle-jons"` produces a Pipeline draft visible in ME Manager's Inbox |
| §2 Games pipeline | All 3 games appear in Portfolio with `displaySites: ["uncle-jons"]`; a real commit in each repo produces a Pipeline draft without manual intervention |
| §2.4 Asset Forge loop | A Forge delivery (post-approval) produces a Ship event automatically, with the delivered asset attached as `mediaUrls` — approval itself stays manual, on Jon |
| §3 Voice clone | Real training audio collected (45–90 min); `jon-v1` trained and passing `/train/status`; a real Video Studio render uses it end-to-end; espeak-ng still present as fallback |

---

## 5. What NOT to do

- Do not build a new posting/scheduling mechanism anywhere — extend the existing
  `/api/me-manager/posts*` + Ship event contract only.
- Do not build a second, different contact-form mechanism for the new Uncle Jon's site or
  for Jacob Roman — reuse WWFL's `/api/contact` route in both cases.
- Do not remove CtrlPanel or espeak-ng — both are relocate/fallback, not replace-and-delete.
- Do not invent a `siteKey` naming scheme different from the existing lowercase-hyphenated
  pattern (`wwfl`, `kecktech`, `jacob-roman` → `uncle-jons`).
- Do not touch the non-canonical Kecktech repo until §0.1 is resolved.
- Do not resume Jacob Roman's internal NextAuth/BullMQ work until §0.2 is resolved.
- Do not have Cursor (or any automation) approve Asset Forge Studio requests
  (`8b14b38e9cc7`, `1c189b83ca9e`) — that review step is intentionally manual and belongs
  to Jon.
- Do not present `how-dare-you-sir` or `squirrel-commander` as Roblox games anywhere in
  the new site's copy — both are archived-Roblox, active-Unity-6 now.
- Do not write new voice-cloning inference/training code — `voice-clone-service` already
  exists; the task is finishing its dataset and wiring it to Video Studio, not rebuilding it.
