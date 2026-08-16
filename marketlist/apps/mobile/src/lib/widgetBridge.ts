import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React from 'react';
import { ActiveListWidget } from '../../widget/ActiveListWidget';

export const ACTIVE_LIST_WIDGET_KEY = 'marketlist.activeListWidget';

export type ActiveListWidgetPayload = {
  updatedAt: string;
  activeListCount: number;
  uncheckedItemCount: number;
  primaryListName: string | null;
  primaryListId: string | null;
};

/**
 * Writes a shared snapshot for home-screen widgets.
 * Android: requests react-native-android-widget update when native module is linked (EAS).
 * iOS: App Group UserDefaults require a Widget Extension (see WIDGET.md).
 */
export const writeActiveListWidgetSnapshot = async (
  payload: ActiveListWidgetPayload,
): Promise<void> => {
  const json = JSON.stringify(payload);
  await AsyncStorage.setItem(ACTIVE_LIST_WIDGET_KEY, json);

  if (Platform.OS !== 'android') return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('react-native-android-widget') as {
      requestWidgetUpdate: (opts: {
        widgetName: string;
        renderWidget: () => React.ReactElement;
      }) => Promise<void>;
    };
    await widget.requestWidgetUpdate({
      widgetName: 'ActiveList',
      renderWidget: () =>
        ActiveListWidget({
          activeListCount: payload.activeListCount,
          uncheckedItemCount: payload.uncheckedItemCount,
          primaryListName: payload.primaryListName,
        }),
    });
  } catch {
    // Expo Go / missing native link — AsyncStorage snapshot remains for EAS builds.
  }
};

export const readActiveListWidgetSnapshot = async (): Promise<ActiveListWidgetPayload | null> => {
  const raw = await AsyncStorage.getItem(ACTIVE_LIST_WIDGET_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveListWidgetPayload;
  } catch {
    return null;
  }
};
