/**
 * Wearable notification settings – user chooses morning briefing time.
 * Uses expo-notifications with a daily local schedule that fetches
 * scores + composes the notification body when it fires.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_ENABLED = 'vg_notif_morning_enabled';
const STORAGE_HOUR = 'vg_notif_morning_hour';
const STORAGE_MIN = 'vg_notif_morning_min';
const STORAGE_ID = 'vg_notif_morning_id';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function WearableNotifSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useEffect(() => {
    (async () => {
      const [e, h, m, perm] = await Promise.all([
        AsyncStorage.getItem(STORAGE_ENABLED),
        AsyncStorage.getItem(STORAGE_HOUR),
        AsyncStorage.getItem(STORAGE_MIN),
        Notifications.getPermissionsAsync(),
      ]);
      setEnabled(e === 'true');
      if (h) setHour(parseInt(h, 10));
      if (m) setMinute(parseInt(m, 10));
      setPermission(perm.status as any);
    })();
  }, []);

  const scheduleOrCancel = async (nextEnabled: boolean, h: number, m: number) => {
    setSaving(true);
    try {
      // Remove existing
      const oldId = await AsyncStorage.getItem(STORAGE_ID);
      if (oldId) {
        try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
        await AsyncStorage.removeItem(STORAGE_ID);
      }

      if (nextEnabled) {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          setPermission(req.status as any);
          if (req.status !== 'granted') {
            Alert.alert('Berechtigung fehlt', 'Bitte Benachrichtigungen in den System‑Einstellungen erlauben.');
            setSaving(false);
            setEnabled(false);
            await AsyncStorage.setItem(STORAGE_ENABLED, 'false');
            return;
          }
        }
        // Schedule daily local notification
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Guten Morgen! ☀️',
            body: `Dein VitaGuide‑Briefing ist bereit – oeffne die App fuer deinen heutigen Readiness‑Score.`,
            sound: 'default',
          },
          trigger: {
            hour: h,
            minute: m,
            repeats: true,
          } as any,
        });
        await AsyncStorage.setItem(STORAGE_ID, id);
      }
      await AsyncStorage.setItem(STORAGE_ENABLED, nextEnabled ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_HOUR, String(h));
      await AsyncStorage.setItem(STORAGE_MIN, String(m));
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Konnte Benachrichtigung nicht setzen.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (v: boolean) => {
    setEnabled(v);
    await scheduleOrCancel(v, hour, minute);
  };

  const commitTime = async (h: number, m: number) => {
    setHour(h); setMinute(m);
    if (enabled) await scheduleOrCancel(true, h, m);
    else {
      await AsyncStorage.setItem(STORAGE_HOUR, String(h));
      await AsyncStorage.setItem(STORAGE_MIN, String(m));
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="notif-back">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.heroCard} testID="notif-hero">
          <MaterialCommunityIcons name="bell-ring" size={26} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Morgen‑Briefing</Text>
            <Text style={styles.heroSub}>Dein Readiness‑Score als taegliche Push‑Erinnerung</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Morgen‑Briefing</Text>
            <Text style={styles.rowSub}>Taeglich um {pad(hour)}:{pad(minute)} Uhr</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={saving}
            thumbColor={enabled ? '#FFFFFF' : '#F3F4F6'}
            trackColor={{ true: '#C2272F', false: '#D1D5DB' }}
            testID="notif-toggle"
          />
        </View>

        <Text style={styles.sectionTitle}>Uhrzeit waehlen</Text>
        <View style={styles.timeCard}>
          <View style={styles.timeCol}>
            <Text style={styles.timeColLabel}>Stunde</Text>
            <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.timeItem, hour === h && styles.timeItemActive]}
                  onPress={() => commitTime(h, minute)}
                  testID={`notif-hour-${h}`}
                >
                  <Text style={[styles.timeItemText, hour === h && styles.timeItemTextActive]}>{pad(h)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <Text style={styles.timeSep}>:</Text>
          <View style={styles.timeCol}>
            <Text style={styles.timeColLabel}>Minute</Text>
            <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.timeItem, minute === m && styles.timeItemActive]}
                  onPress={() => commitTime(hour, m)}
                  testID={`notif-min-${m}`}
                >
                  <Text style={[styles.timeItemText, minute === m && styles.timeItemTextActive]}>{pad(m)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {saving && <ActivityIndicator color="#C2272F" style={{ marginTop: 12 }} />}

        {permission === 'denied' && (
          <View style={styles.warnCard} testID="notif-permission-warning">
            <MaterialCommunityIcons name="alert-circle" size={18} color="#B45309" />
            <Text style={styles.warnText}>
              Benachrichtigungen sind system­seitig blockiert. Bitte in den {Platform.OS === 'ios' ? 'iOS‑' : 'Android‑'}Einstellungen erlauben.
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#0C4A6E" />
          <Text style={styles.infoText}>
            Beim Antippen der Benachrichtigung oeffnet sich dein Dashboard mit dem aktuellen Readiness‑Score,
            HRV‑Trend und einem konkreten Tages‑Vorschlag.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A2E35' },
  content: { padding: 20 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#C2272F', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20,
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#1A2E35' },
  rowSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  timeCol: { flex: 1 },
  timeColLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textAlign: 'center', marginBottom: 6 },
  timeScroll: { height: 180 },
  timeItem: {
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center',
    marginVertical: 2,
  },
  timeItemActive: { backgroundColor: '#C2272F' },
  timeItemText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  timeItemTextActive: { color: '#FFFFFF', fontWeight: '800' },
  timeSep: { fontSize: 28, color: '#9CA3AF', fontWeight: '700' },
  warnCard: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24', borderWidth: 1, borderRadius: 10,
    padding: 12, marginTop: 16, alignItems: 'flex-start',
  },
  warnText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 16 },
  infoCard: {
    flexDirection: 'row', gap: 8, backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD', borderWidth: 1, borderRadius: 10,
    padding: 12, marginTop: 16, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: '#0C4A6E', lineHeight: 17 },
});
