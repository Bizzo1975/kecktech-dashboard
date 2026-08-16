# Store submit gate (blocked on you)

This file tracks the **only remaining store-ship blockers** that cannot be completed in-repo without your credentials and assets.

## Required from you

1. Run `eas login` + `eas init` in `apps/mobile` → real `extra.eas.projectId` UUID in `app.json`
2. Apple: `appleId`, `ascAppId`, `appleTeamId` into [`eas.json`](eas.json) submit.ios
3. Google: place `google-service-account.json` in `apps/mobile/` (gitignored)
4. Capture screenshots listed in [`STORE_LISTING.md`](STORE_LISTING.md)

## After you provide them

```bat
cd apps\mobile
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Until then: **do not claim App Store / Play shipped.** Preview/internal builds are the shippable consumer path.
