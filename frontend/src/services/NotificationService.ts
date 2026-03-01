import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ReminderSettings {
  enabled: boolean;
  morning_time: string;
  noon_time: string;
  evening_time: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  dosage: number;
  unit: string;
}

export interface WeeklySchedule {
  morning?: { label: string; items: ScheduleItem[] };
  noon?: { label: string; items: ScheduleItem[] };
  evening?: { label: string; items: ScheduleItem[] };
}

const STORAGE_KEY = 'supplement_reminder_ids';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Web browser notifications
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Native (iOS/Android)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Clear stored notification IDs for web
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Native: cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Cancel reminders error:', e);
  }
}

/**
 * Parse time string "HH:MM" to hours and minutes
 */
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h || 8, minute: m || 0 };
}

/**
 * Schedule supplement reminders
 */
export async function scheduleSupplementReminders(
  reminders: ReminderSettings,
  schedule: WeeklySchedule,
  lang: string = 'de'
): Promise<boolean> {
  if (!reminders.enabled) {
    await cancelAllReminders();
    return false;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permission not granted');
    return false;
  }

  // Cancel existing reminders first
  await cancelAllReminders();

  const timings = [
    { key: 'morning' as const, time: reminders.morning_time, label: lang === 'de' ? 'Morgens' : 'Mattina' },
    { key: 'noon' as const, time: reminders.noon_time, label: lang === 'de' ? 'Mittags' : 'Mezzogiorno' },
    { key: 'evening' as const, time: reminders.evening_time, label: lang === 'de' ? 'Abends' : 'Sera' },
  ];

  const scheduledIds: string[] = [];

  for (const timing of timings) {
    const section = schedule[timing.key];
    const items = section?.items || [];
    if (items.length === 0) continue;

    const { hour, minute } = parseTime(timing.time);
    const names = items.map(i => i.name).join(', ');

    const title = `VitaGuide - ${timing.label}`;
    const body = lang === 'de' 
      ? `Zeit für Ihre Supplements: ${names}` 
      : `Ora dei tuoi integratori: ${names}`;

    if (Platform.OS === 'web') {
      // Web: Schedule using setTimeout (for demo/testing)
      scheduleWebNotification(hour, minute, title, body);
    } else {
      // Native: Use expo-notifications daily trigger
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { timing: timing.key },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        scheduledIds.push(id);
      } catch (e) {
        console.error(`Schedule ${timing.key} error:`, e);
      }
    }
  }

  // Store scheduled notification IDs
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledIds));
  
  return scheduledIds.length > 0 || Platform.OS === 'web';
}

/**
 * Web-specific notification scheduling using setTimeout
 */
function scheduleWebNotification(hour: number, minute: number, title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  
  // For web demo: show notification after calculated delay (max 24h)
  // In production, you'd use service workers for persistent scheduling
  if (delay < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.png',
          tag: `supplement-${hour}-${minute}`,
          requireInteraction: true,
        });
      } catch (e) {
        console.error('Web notification error:', e);
      }
    }, delay);
  }
}

/**
 * Send an immediate test notification
 */
export async function sendTestNotification(lang: string = 'de'): Promise<boolean> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  const title = 'VitaGuide';
  const body = lang === 'de' 
    ? 'Erinnerungen erfolgreich aktiviert!' 
    : 'Promemoria attivati con successo!';

  if (Platform.OS === 'web') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.png' });
      return true;
    }
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Immediate
    });
    return true;
  } catch (e) {
    console.error('Test notification error:', e);
    return false;
  }
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    if ('Notification' in window) {
      const perm = Notification.permission;
      if (perm === 'granted') return 'granted';
      if (perm === 'denied') return 'denied';
      return 'undetermined';
    }
    return 'denied';
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}
