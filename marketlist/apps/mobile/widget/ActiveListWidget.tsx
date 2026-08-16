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
    clickAction="OPEN_APP"
  >
    <TextWidget text="Marketlist" style={{ fontSize: 14, color: '#5C6B63' }} />
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
