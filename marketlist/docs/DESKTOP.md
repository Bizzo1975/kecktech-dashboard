# Marketlist Desktop (Electron)

Desktop wraps the hosted Marketlist web app (or a local production build) with Electron + electron-builder.

## Scripts

From `apps/web`:

| Script | Purpose |
|--------|---------|
| `npm run electron` | Launch Electron against `MARKETLIST_WEB_URL` (default production URL) |
| `npm run build:desktop` | Package installers via electron-builder (`dist-desktop/`) |

Root convenience (optional):

```bash
npm run build:desktop -w @marketlist/web
```

## Config

- `electron-main.js` — BrowserWindow loads `MARKETLIST_WEB_URL` or `https://marketlist.kecktech.net`
- `electron-builder.yml` — Windows NSIS + macOS DMG targets

### Environment

```bash
set MARKETLIST_WEB_URL=https://marketlist.kecktech.net
npm run electron -w @marketlist/web
```

For a local Next server:

```bash
set MARKETLIST_WEB_URL=http://localhost:3001
npm run dev -w @marketlist/web
npm run electron -w @marketlist/web
```

## Build artifacts

```bash
cd apps/web
npm run build:desktop
```

Outputs land in `apps/web/dist-desktop/`:

- Windows: NSIS installer (`Marketlist Setup *.exe`)
- macOS: DMG (build on macOS or CI mac runner)

Icon: use `../../apps/mobile/assets/icon.png` (referenced in `electron-builder.yml`). Replace with a dedicated `.icns` / `.ico` for store polish.

## Notes

- This is a URL wrap, not a next export offline shell. Auth cookies follow the loaded origin.
- Code signing / notarization are not configured — add Apple/Windows certs before store distribution.
