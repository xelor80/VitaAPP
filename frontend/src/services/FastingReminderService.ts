/**
 * FastingReminderService
 * Schedules local daily notifications for the user's fasting window.
 * - 15 min before eating window opens ("Dein Essensfenster startet bald")
 * - At eating window start ("Essensfenster ist offen")
 * - At eating window end / fasting starts ("Fasten beginnt jetzt")
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fasting_reminder_ids_v1';

interface Schedule {
  eating_window_start: string; // "HH:MM"
  eating_window_hours: number;
  reminders_enabled?: boolean;
}

const L = (de: string, it: string, en: string, lang: string) =>
  lang === 'it' ? it : lang === 'en' ? en : de;

function parseHHMM(s: string): { h: number; m: number } | null {
  const parts = (s || '').split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function addMinutes(h: number, m: number, delta: number): { h: number; m: number } {
  let total = h * 60 + m + delta;
  total = ((total % 1440) + 1440) % 1440;
  return { h: Math.floor(total / 60), m: total % 60 };
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

export async function cancelFastingReminders(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      for (const id of ids) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) { console.warn('cancelFastingReminders', e); }
}

export async function scheduleFastingReminders(schedule: Schedule, lang: string = 'de'): Promise<boolean> {
  // Always cancel existing first to avoid duplicates
  await cancelFastingReminders();

  if (!schedule?.reminders_enabled) return false;
  if (Platform.OS === 'web') return false;

  const ok = await ensurePermission();
  if (!ok) return false;

  const start = parseHHMM(schedule.eating_window_start);
  if (!start) return false;
  const windowMin = Math.round(schedule.eating_window_hours * 60);
  if (windowMin < 30) return false;

  const preStart = addMinutes(start.h, start.m, -15);
  const end = addMinutes(start.h, start.m, windowMin);
  const preEnd = addMinutes(end.h, end.m, -15);

  const triggers = [
    {
      key: 'shake1',
      hour: start.h,
      minute: start.m,
      title: L('Zeit fuer Shake 1', 'Ora di Shake 1', 'Time for Shake 1', lang),
      body: L('Starte ruhig in deinen Plan. + 300ml Wasser dazu.', 'Inizia con calma. + 300ml acqua.', 'Ease into your day. +300ml water.', lang),
    },
    {
      key: 'shake2',
      hour: addMinutes(start.h, start.m, Math.round((windowMin - 90) / 3)).h,
      minute: addMinutes(start.h, start.m, Math.round((windowMin - 90) / 3)).m,
      title: L('Dein zweiter Shake ist dran', 'Secondo shake', 'Second shake', lang),
      body: L('So bleibst du stabil bis zur kleinen Mahlzeit. + 300ml Wasser.', 'Resti stabile fino al prossimo pasto.', 'Stay stable until next meal.', lang),
    },
    {
      key: 'small_meal',
      hour: addMinutes(start.h, start.m, Math.round((windowMin - 90) * 2 / 3)).h,
      minute: addMinutes(start.h, start.m, Math.round((windowMin - 90) * 2 / 3)).m,
      title: L('Kleine Mahlzeit eintragen', 'Piccolo pasto', 'Small meal', lang),
      body: L('Ab jetzt ist deine kleine Mahlzeit vorgesehen. + 300ml Wasser.', 'Tempo del piccolo pasto.', 'Time for your small meal.', lang),
    },
    {
      key: 'large_meal',
      hour: addMinutes(start.h, start.m, windowMin - 90).h,
      minute: addMinutes(start.h, start.m, windowMin - 90).m,
      title: L('Plane jetzt deine grosse Mahlzeit', 'Pianifica il pasto principale', 'Plan your main meal', lang),
      body: L('Bleib im Tagesziel. + 300ml Wasser dazu.', 'Resta nel target. +300ml acqua.', 'Stay on target. +300ml water.', lang),
    },
    {
      key: 'fast_end',
      hour: end.h,
      minute: end.m,
      title: L('Tagesabschluss', 'Fine giornata', 'Day end', lang),
      body: L('Heute hast du gut geliefert. Wasser und Tee helfen dir bis morgen.', 'Bel lavoro oggi.', 'Good work today.', lang),
    },
  ];

  const ids: string[] = [];
  for (const t of triggers) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t.title,
          body: t.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'fasting_reminder', key: t.key },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: t.hour,
          minute: t.minute,
        },
      });
      ids.push(id);
    } catch (e) {
      console.warn('schedule fasting reminder error', t.key, e);
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  return ids.length > 0;
}

export async function getDeviceTimezone(): Promise<{ tz: string; offset: number }> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
    const offset = -new Date().getTimezoneOffset();
    return { tz, offset };
  } catch {
    return { tz: 'Europe/Berlin', offset: 60 };
  }
}
