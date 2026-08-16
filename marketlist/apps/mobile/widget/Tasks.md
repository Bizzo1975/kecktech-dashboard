# Android ActiveList widget tasks

## Done in JS

- [x] `widget/ActiveListWidget.tsx` — FlexWidget UI (count + open items)
- [x] `widget/ActiveList.tsx` — `widgetTaskHandler` for system updates
- [x] `index.ts` entry registers `registerWidgetTaskHandler` on Android
- [x] `app.json` config plugin for `ActiveList`
- [x] `src/lib/widgetBridge.ts` writes AsyncStorage + `requestWidgetUpdate`
- [x] Home / list detail refresh the snapshot after load

## EAS / native remaining

- [ ] Run `eas build` / `npx expo prebuild` so the config plugin generates the Android widget provider (not available in Expo Go)
- [ ] Place widget on home screen and confirm updates after opening Lists
- [ ] Optional: SharedPreferences mirror if AsyncStorage cannot be read from the widget process on a specific OEM

## iOS

- [ ] Widget Extension is docs-only — see `../WIDGET.md` Swift snippet + App Group
