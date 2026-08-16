import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget') as {
      registerWidgetTaskHandler: (handler: unknown) => void;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetTaskHandler } = require('./widget/ActiveList');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Native module unavailable in Expo Go — widgetBridge still writes AsyncStorage snapshot.
  }
}
