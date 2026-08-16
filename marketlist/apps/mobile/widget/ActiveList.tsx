import React from 'react';
import type { WidgetInfo } from 'react-native-android-widget';
import { ActiveListWidget } from './ActiveListWidget';
import { readActiveListWidgetSnapshot } from '../src/lib/widgetBridge';

export { ActiveListWidget };

export const widgetTaskHandler = async (props: {
  widgetInfo: WidgetInfo;
  widgetAction: string;
  clickAction?: string;
  clickActionData?: Record<string, unknown>;
  renderWidget: (widget: React.ReactElement) => void;
}) => {
  if (props.widgetInfo.widgetName !== 'ActiveList') return;
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readActiveListWidgetSnapshot();
  props.renderWidget(
    <ActiveListWidget
      activeListCount={snapshot?.activeListCount ?? 0}
      uncheckedItemCount={snapshot?.uncheckedItemCount ?? 0}
      primaryListName={snapshot?.primaryListName ?? null}
    />,
  );
};
