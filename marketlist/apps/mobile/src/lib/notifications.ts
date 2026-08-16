import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiFetch } from './api';

const EXPIRING_NOTIFICATION_ID = 'marketlist-expiring-pantry';
const TRIP_REMINDER_ID = 'marketlist-trip-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotifications = async (accessToken: string): Promise<string | null> => {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Marketlist',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;

  const push = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = push.data;
  await apiFetch('/me/push-token', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify({ pushToken: token }),
  });
  return token;
};

const cancelId = async (id: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // identifier may not exist yet
  }
};

export const scheduleExpiringPantryNudge = async (opts: {
  enabled: boolean;
  count: number;
}) => {
  await cancelId(EXPIRING_NOTIFICATION_ID);
  if (!opts.enabled || opts.count < 1) return;
  await Notifications.scheduleNotificationAsync({
    identifier: EXPIRING_NOTIFICATION_ID,
    content: {
      title: 'Pantry expiring soon',
      body:
        opts.count === 1
          ? '1 pantry item is expiring within 5 days.'
          : `${opts.count} pantry items are expiring within 5 days.`,
      data: { type: 'expiring' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 8,
      repeats: false,
    },
  });
};

export const scheduleTripReminder = async (opts: {
  enabled: boolean;
  remainingCount: number;
  listName?: string;
}) => {
  await cancelId(TRIP_REMINDER_ID);
  if (!opts.enabled || opts.remainingCount < 1) return;
  await Notifications.scheduleNotificationAsync({
    identifier: TRIP_REMINDER_ID,
    content: {
      title: 'List reminder',
      body: opts.listName
        ? `${opts.listName}: ${opts.remainingCount} items still open.`
        : `You have ${opts.remainingCount} open list items.`,
      data: { type: 'trip-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
    },
  });
};

export const syncNotificationPrefs = async (opts: {
  accessToken: string;
  notifyExpiring: boolean;
  notifyTripReminder: boolean;
  householdId: string | null;
}) => {
  if (opts.notifyExpiring || opts.notifyTripReminder) {
    await registerForPushNotifications(opts.accessToken);
  }

  if (opts.notifyExpiring && opts.householdId) {
    const pantry = await apiFetch<{ items: Array<{ expiryDate?: string | null }> }>(
      `/pantry?householdId=${opts.householdId}&expiringWithinDays=5`,
      { token: opts.accessToken },
    );
    const count = pantry.success ? pantry.data.items.length : 0;
    await scheduleExpiringPantryNudge({ enabled: true, count });
  } else {
    await scheduleExpiringPantryNudge({ enabled: false, count: 0 });
  }

  if (!opts.notifyTripReminder) {
    await scheduleTripReminder({ enabled: false, remainingCount: 0 });
  }
};
