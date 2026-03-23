import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Smart suppression: Skip water reminders if user recently logged water
    const data = notification.request.content.data;
    if (data?.type === 'water_reminder') {
      try {
        const lastWater = await AsyncStorage.getItem('last_water_time');
        if (lastWater) {
          const elapsed = Date.now() - parseInt(lastWater, 10);
          const thirtyMin = 30 * 60 * 1000;
          if (elapsed < thirtyMin) {
            // User drank water within last 30 minutes – suppress
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }
        }
      } catch {}
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
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

export interface CombinedTimingItem {
  name: string;
  type: 'supplement' | 'medication';
}

export interface CombinedSchedule {
  morning: CombinedTimingItem[];
  noon: CombinedTimingItem[];
  evening: CombinedTimingItem[];
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
 * Schedule combined reminders for supplements AND medications
 */
export async function scheduleCombinedReminders(
  reminders: ReminderSettings,
  combinedSchedule: CombinedSchedule,
  lang: string = 'de'
): Promise<boolean> {
  if (!reminders.enabled) {
    await cancelAllReminders();
    return false;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  await cancelAllReminders();

  const timings = [
    { key: 'morning' as const, time: reminders.morning_time, label: lang === 'de' ? 'Morgens' : 'Mattina' },
    { key: 'noon' as const, time: reminders.noon_time, label: lang === 'de' ? 'Mittags' : 'Mezzogiorno' },
    { key: 'evening' as const, time: reminders.evening_time, label: lang === 'de' ? 'Abends' : 'Sera' },
  ];

  const scheduledIds: string[] = [];

  for (const timing of timings) {
    const items = combinedSchedule[timing.key] || [];
    if (items.length === 0) continue;

    const { hour, minute } = parseTime(timing.time);
    const names = items.map(i => i.name).join(', ');
    const suppCount = items.filter(i => i.type === 'supplement').length;
    const medCount = items.filter(i => i.type === 'medication').length;

    const title = `VitaGuide - ${timing.label}`;
    let body: string;
    if (lang === 'de') {
      const parts: string[] = [];
      if (suppCount > 0) parts.push(`${suppCount} Supplement${suppCount > 1 ? 's' : ''}`);
      if (medCount > 0) parts.push(`${medCount} Medikament${medCount > 1 ? 'e' : ''}`);
      body = `Zeit fuer: ${names} (${parts.join(' + ')})`;
    } else {
      const parts: string[] = [];
      if (suppCount > 0) parts.push(`${suppCount} supplementi`);
      if (medCount > 0) parts.push(`${medCount} farmaci`);
      body = `Ora di: ${names} (${parts.join(' + ')})`;
    }

    if (Platform.OS === 'web') {
      scheduleWebNotification(hour, minute, title, body);
    } else {
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

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledIds));
  return scheduledIds.length > 0 || Platform.OS === 'web';
}

/**
 * Schedule supplement reminders (legacy, kept for compatibility)
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

// ── Water Reminder Notifications ──

export interface WaterReminderConfig {
  enabled: boolean;
  interval_hours: number; // 1, 2, or 3
  start_time: string;     // "08:00"
  end_time: string;       // "22:00"
}

const WATER_REMINDER_KEY = 'water_reminder_ids';

const VERO_MESSAGES: Record<string, string[]> = {
  de: [
    'Hey! Zeit fuer ein Glas Wasser!',
    'VERO erinnert dich: Trink etwas Wasser!',
    'Dein Koerper braucht Fluessigkeit - trink ein Glas!',
    'Kurze Pause? Perfekt fuer ein Glas Wasser!',
    'Bleib hydriert! VERO passt auf dich auf.',
  ],
  it: [
    'Ehi! E ora di bere un bicchiere d\'acqua!',
    'VERO ti ricorda: bevi un po\' d\'acqua!',
    'Il tuo corpo ha bisogno di liquidi - bevi un bicchiere!',
    'Pausa breve? Perfetta per un bicchiere d\'acqua!',
    'Resta idratato! VERO si prende cura di te.',
  ],
  en: [
    'Hey! Time for a glass of water!',
    'VERO reminds you: Drink some water!',
    'Your body needs fluids - have a glass!',
    'Quick break? Perfect for a glass of water!',
    'Stay hydrated! VERO is looking out for you.',
  ],
};

/**
 * Schedule water reminder notifications at regular intervals
 */
export async function scheduleWaterReminders(
  config: WaterReminderConfig,
  lang: string = 'de'
): Promise<boolean> {
  // Cancel existing water reminders
  await cancelWaterReminders();

  if (!config.enabled) return false;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  const [startH, startM] = config.start_time.split(':').map(Number);
  const [endH, endM] = config.end_time.split(':').map(Number);
  const startMin = (startH || 8) * 60 + (startM || 0);
  const endMin = (endH || 22) * 60 + (endM || 0);

  const messages = VERO_MESSAGES[lang] || VERO_MESSAGES.de;
  const scheduledIds: string[] = [];
  let msgIdx = 0;

  for (let min = startMin; min <= endMin; min += config.interval_hours * 60) {
    const hour = Math.floor(min / 60);
    const minute = min % 60;
    const body = messages[msgIdx % messages.length];
    msgIdx++;

    if (Platform.OS === 'web') {
      scheduleWebNotification(hour, minute, 'VERO - Wasser Erinnerung', body);
    } else {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'VERO - Wasser Erinnerung',
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { type: 'water_reminder' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        scheduledIds.push(id);
      } catch (e) {
        console.error(`Water reminder schedule error (${hour}:${minute}):`, e);
      }
    }
  }

  await AsyncStorage.setItem(WATER_REMINDER_KEY, JSON.stringify(scheduledIds));
  return scheduledIds.length > 0 || Platform.OS === 'web';
}

/**
 * Cancel all water reminder notifications
 */
export async function cancelWaterReminders(): Promise<void> {
  try {
    const idsJson = await AsyncStorage.getItem(WATER_REMINDER_KEY);
    if (idsJson && Platform.OS !== 'web') {
      const ids: string[] = JSON.parse(idsJson);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    await AsyncStorage.removeItem(WATER_REMINDER_KEY);
  } catch (e) {
    console.error('Cancel water reminders error:', e);
  }
}
