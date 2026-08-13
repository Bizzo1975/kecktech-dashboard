# Jacob books ↔ Lost in Thought ↔ ME Manager

## Author isolation

- Persona siteKey: **`jacob-roman`** only  
- Never ship book progress with tech `"both"` / `kecktech` / `wwfl`  
- LiT is a **source** only — see [LIT-SHIP.md](F:/Github/me-manager/docs/guides/LIT-SHIP.md)

## Book bibles — confirmed paths (Aug 12 2026 scan)

| Working title | Source path | Maturity |
|---------------|-------------|----------|
| The Quiet Field | `F:/LiT-author-files` | **Partially drafted.** 36 chapter bodies (`import-sources/quiet-field-v1/chapters/01–36.md`), 16 enriched character profiles, full concept + framework docs, 15 subplots, structured locations/objects/factions, large research corpus. 4 enriched profiles still pending (fatima, padraig, bea, ciaran). |
| My Disposable Lives | `C:/Users/jonkd/OneDrive/Desktop/My_Disposable_Lives_Bible` | **Complete bible, no prose.** Premise/framework, full chapter outline, plot + subplots, scene list, principal + supporting characters, world/timeline, DNA-forensics research. Names are proposals, not locked. |
| Yours, Mine, and the Truth | `C:/Users/jonkd/OneDrive/Desktop/yours-mine-and-the-truth` | **Complete bible, no prose.** Framework (HIS/HERS/TRUTH/LIVE modes), characters, 28-chapter skeleton across 7 camp days, scene cards, plot + subplots, story-pair bank. All names are placeholders. |
| 101 Perspectives | `C:/Users/jonkd/OneDrive/Desktop/101_perspectives_framework` | **Framework + one sample chapter.** Part skeletons I–VI + coda, sample chapter (Q9). **Blocked on data:** the Lockbook (35 self-answers + crowd predictions) must be completed, hashed, and locked *before* any survey goes out. |
| Know Your Number | `C:/Users/jonkd/OneDrive/Desktop/know-your-number-book-bible` | **Complete bible, no prose.** Core theory, arc, voice guide, running gags, scene templates, story inventory, 14 chapter skeletons + front matter. **Blocked on input:** real story capture (`06_story_inventory.md`) — 7 drafted premises are placeholders. |

LiT / Huxley repo: `F:/Github/Huxley` → https://lostinthought.kecktech.net

## Teaser drafts

Reader-facing concept teasers live in [`jacob-teasers/`](./jacob-teasers/) — one file per work, YAML frontmatter (`title`, `summary`, `slug`) plus a short literary blog body in Jacob Author voice. Ship them with [`ship-jacob-novel-teasers.ps1`](./ship-jacob-novel-teasers.ps1).

**Approval rule:** teasers ship as drafts only. ME Manager lands the package at `awaiting_approval` and never auto-publishes site or social. Jon approves in Pipeline → Inbox. Do not add any auto-approve/auto-publish flag to the ship script.

### Ship status — Aug 12 2026 (closeout)

Auth + soft-fail pipeline deployed. Re-ship with `-RetrySuffix r3` landed all five at **`awaiting_approval`** (Inbox). Matching Jacob CMS drafts via bridge — **not published**.

| Slug | Package | Status |
|------|---------|--------|
| `101-perspectives` | `cmsqplbtd0003pyg64zek9akb` | awaiting_approval |
| `know-your-number` | `cmsqpmk2k000fpyg6j9rpavii` | awaiting_approval |
| `my-disposable-lives` | `cmsqpnpo9000mpyg66193je8d` | awaiting_approval |
| `the-quiet-field` | `cmsqppcva000tpyg6t5ox51am` | awaiting_approval |
| `yours-mine-and-the-truth` | `cmsqpr7n70010pyg6xm21w57c` | awaiting_approval |

**Daily only:** Approve or schedule in ME Manager Inbox (`jacob-roman`). Do not auto-publish.

Older stalled `site_drafted` packages from the first attempt can be cancelled/ignored.

## Operator rule

After any bible or LiT session:

1. Confirm a `lost-in-thought` / ship package appears in ME Manager Inbox for `jacob-roman`, **or**  
2. Log an explicit skip in the daily wrap  

## Site surfaces

| Item | Path | Status |
|------|------|--------|
| `/about` author copy | `Running Apps/psuedonym-site/app/about/page.tsx` → host `/opt/jacob-roman-blog` | **Deployed** (VM 304) |
| `/contact` + Graph | `app/contact` + `app/api/contact` | **Deployed** (Graph env on host) |
| ME Manager bridge | `/api/me-manager/posts*` | Live contract in SITE_HOOKS |

## Default ship target

```json
{
  "targets": { "site": "jacob-roman", "social": true },
  "userFacing": true,
  "source": "lost-in-thought"
}
```
