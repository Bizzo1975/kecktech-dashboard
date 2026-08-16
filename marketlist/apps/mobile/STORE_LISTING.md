# Marketlist — App Store / Play Store submission prep

## Identifiers
- iOS bundle: `com.marketlist.app`
- Android package: `com.marketlist.app`
- Display name: Marketlist
- **Apple App Store Connect app ID:** blocked — `eas.json` still has `REPLACE_*` placeholders (`appleId`, `ascAppId`, `appleTeamId`)
- **Google Play app ID / listing:** blocked — needs Play Console app + `apps/mobile/google-service-account.json` (gitignored)

## Listing copy (draft)
**Subtitle:** Shared lists that sort by aisle  
**Short description:** Household grocery lists with aisle sorting, pantry alerts, and recipe-to-list.  
**Full description:**
Marketlist helps households shop together. Share one live list, auto-sort by aisle, keep pantry expiry honest, and turn recipes into shopping lists — without noisy AI guesswork.

## Privacy
- In-app / web: `/privacy` (also `docs/PRIVACY.md`)
- Data export: `GET /api/me/export`

## Assets checklist

| Asset | Exact size / note | Status |
|-------|-------------------|--------|
| App icon source | 1024×1024 (`apps/mobile/assets/icon.png`) | Done |
| Adaptive icon + splash | `adaptive-icon.png`, `splash-icon.png` | Done |
| iPhone 6.7" screenshots | **1290×2796** — home, list aisle view, pantry, capture | **Pending user capture** |
| iPhone 6.5" screenshots | **1284×2778** (optional App Store set) | **Pending user capture** |
| iPhone 5.5" screenshots | **1242×2208** | **Pending user capture** |
| Android phone screenshots | **1080×1920** (or 1080×2340) — same 4 screens | **Pending user capture** |
| Play feature graphic | **1024×500** | **Pending user capture** |

Suggested capture set (all platforms): Home, Lists/aisle checklist, Pantry, Capture.

## EAS project linking (required once)

`app.json` still has placeholder `extra.eas.projectId: "marketlist-local"` until you run:

```bat
cd apps\mobile
eas login
eas init
```

That writes a real Expo project UUID. Preview builds require this.

## Native build + speech QA

Preview already points at prod API (`https://marketlist.kecktech.net/api` in `eas.json`).

```bat
cd apps\mobile
eas login
eas init
eas build --profile development --platform android
eas build --profile preview --platform android
```

**Speech QA:** install the **development** or **preview** native build (not Expo Go). Open Capture → Voice. Expo Go must still show the honest “needs development build” gate.

```bat
eas build --profile preview --platform ios
```

Submit is blocked until credentials:

```bat
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Credentials required from you (blocked until provided)
- Apple Developer account + App Store Connect app record (IDs into `eas.json` submit.ios)
- Google Play Console + service account JSON at `apps/mobile/google-service-account.json` (gitignored)
- Screenshots listed above
- Real EAS `projectId` via `eas init`
