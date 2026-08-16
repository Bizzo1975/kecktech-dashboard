# Marketlist home screen widget

## Shipped in JS

- `apps/mobile/src/lib/widgetBridge.ts` writes an `ActiveListWidget` payload to AsyncStorage (`marketlist.activeListWidget`).
- Lists screens call `writeActiveListWidgetSnapshot` after loading active lists.
- `app.json` lists a plugins note for future EAS native widget packaging.

## Android (real widget)

Preferred package: [`react-native-android-widget`](https://github.com/androidwidget/react-native-android-widget).

1. Install in a **dev client / EAS build** (not Expo Go):

```bash
npx expo install react-native-android-widget
```

2. Add config plugin to `app.json` → `plugins`:

```json
[
  "react-native-android-widget",
  {
    "widgets": [
      {
        "name": "ActiveList",
        "label": "Marketlist lists",
        "minWidth": "180dp",
        "minHeight": "110dp",
        "targetCellWidth": 3,
        "targetCellHeight": 2,
        "description": "Shows how many active shopping lists you have open",
        "previewImage": "./assets/adaptive-icon.png",
        "updatePeriodMillis": 1800000
      }
    ]
  }
]
```

3. Create `apps/mobile/widgets/ActiveList.tsx` that reads `ACTIVE_LIST_WIDGET_KEY` via the package’s Storage helpers (or duplicate the JSON into SharedPreferences in a thin native bridge):

```tsx
// Conceptual — register with the package’s widget task handler
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export const ActiveListWidget = ({
  activeListCount,
  uncheckedItemCount,
  primaryListName,
}: {
  activeListCount: number;
  uncheckedItemCount: number;
  primaryListName: string | null;
}) => (
  <FlexWidget
    style={{
      height: 'match_parent',
      width: 'match_parent',
      backgroundColor: '#E8F0EA',
      padding: 12,
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    <TextWidget text="Marketlist" style={{ fontSize: 14, color: '#1F2A24' }} />
    <TextWidget
      text={`${activeListCount} active list${activeListCount === 1 ? '' : 's'}`}
      style={{ fontSize: 20, color: '#1F2A24', fontWeight: '700' }}
    />
    <TextWidget
      text={
        primaryListName
          ? `${primaryListName} · ${uncheckedItemCount} open`
          : `${uncheckedItemCount} open items`
      }
      style={{ fontSize: 13, color: '#5C6B63' }}
    />
  </FlexWidget>
);
```

4. On EAS prebuild, ensure SharedPreferences / AsyncStorage bridge copies `marketlist.activeListWidget` so the widget process can read it without the RN bridge.

### SharedPreferences bridge (fallback if package fails)

Add a tiny Expo Module / Kotlin snippet on EAS that mirrors the AsyncStorage value:

```kotlin
// MarketlistWidgetPrefs.kt (copy into android after prebuild)
package com.marketlist.app.widget

import android.content.Context
import org.json.JSONObject

object MarketlistWidgetPrefs {
  private const val PREFS = "marketlist_widget"
  private const val KEY = "active_list_payload"

  fun write(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY, json)
      .apply()
  }

  fun read(context: Context): JSONObject? {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY, null) ?: return null
    return JSONObject(raw)
  }
}
```

Call `MarketlistWidgetPrefs.write` from RN via a one-line native module when `writeActiveListWidgetSnapshot` runs.

## iOS (docs-only WidgetKit)

iOS home widgets need a Widget Extension + App Group. Not bundled in Expo managed workflow without `@bacons/apple-targets` or a bare prebuild.

### App Group

1. Enable App Group `group.com.marketlist.app` on the main app + Widget Extension.
2. From RN, write UserDefaults for the group (native module) with the same JSON as `ActiveListWidgetPayload`.

### Widget Extension snippet

```swift
import WidgetKit
import SwiftUI

struct ActiveListEntry: TimelineEntry {
  let date: Date
  let activeListCount: Int
  let uncheckedItemCount: Int
  let primaryListName: String?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> ActiveListEntry {
    ActiveListEntry(date: Date(), activeListCount: 1, uncheckedItemCount: 4, primaryListName: "Weekly run")
  }

  func getSnapshot(in context: Context, completion: @escaping (ActiveListEntry) -> ()) {
    completion(load())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ActiveListEntry>) -> ()) {
    let entry = load()
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
  }

  private func load() -> ActiveListEntry {
    let defaults = UserDefaults(suiteName: "group.com.marketlist.app")
    let count = defaults?.integer(forKey: "activeListCount") ?? 0
    let unchecked = defaults?.integer(forKey: "uncheckedItemCount") ?? 0
    let name = defaults?.string(forKey: "primaryListName")
    return ActiveListEntry(
      date: Date(),
      activeListCount: count,
      uncheckedItemCount: unchecked,
      primaryListName: name
    )
  }
}

struct ActiveListWidgetView: View {
  var entry: ActiveListEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Marketlist").font(.caption).foregroundStyle(.secondary)
      Text("\(entry.activeListCount) active lists").font(.headline)
      Text(entry.primaryListName.map { "\($0) · \(entry.uncheckedItemCount) open" }
        ?? "\(entry.uncheckedItemCount) open items")
        .font(.footnote)
    }
    .padding()
  }
}

@main
struct MarketlistWidgets: WidgetBundle {
  var body: some Widget {
    Widget {
      StaticConfiguration(kind: "ActiveList", provider: Provider()) { entry in
        ActiveListWidgetView(entry: entry)
      }
      .configurationDisplayName("Active lists")
      .description("How many Marketlist lists are open.")
      .supportedFamilies([.systemSmall, .systemMedium])
    }
  }
}
```

## Interim without native widgets

Trip / list sticky local notifications via `expo-notifications` (`scheduleTripReminder` in `src/lib/notifications.ts`) cover the “glanceable reminder” case until EAS widget builds ship.
