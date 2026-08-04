import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWearable } from '../../src/WearableContext';

export default function DeviceSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const w = useWearable();
  const [userId, setUserId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(v => setUserId(v || 'anonymous'));
  }, []);

  const doSync = async () => {
    if (!userId) return;
    setBusy(true);
    const res = await w.syncNow(userId);
    setBusy(false);
    if (res) {
      Alert.alert('Synchronisiert', `${res.inserted} neue Messwerte gespeichert (${res.total} insgesamt).`);
    }
  };

  const confirmUnpair = () => {
    Alert.alert(
      'Band trennen',
      'Möchtest du das Band nur trennen, oder auch alle vom Band synchronisierten Gesundheitsdaten löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Nur trennen',
          onPress: async () => { await w.unpair(false); router.replace('/(tabs)'); },
        },
        {
          text: 'Trennen + Daten löschen',
          style: 'destructive',
          onPress: async () => { await w.unpair(true); router.replace('/(tabs)'); },
        },
      ],
    );
  };

  if (!w.device) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="device-settings-back">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mein VitaGuide Band</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.emptyWrap} testID="device-settings-empty">
          <MaterialCommunityIcons name="watch-variant" size={72} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Noch kein Band verbunden</Text>
          <Text style={styles.emptyText}>
            Verbinde dein VitaGuide Band, um Gesundheitswerte automatisch zu erfassen.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/wearable/onboarding')}
            testID="device-settings-add-btn"
          >
            <Text style={styles.primaryBtnText}>Band verbinden</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {w.isDemo && (
        <View style={styles.demoBanner} testID="device-settings-demo-banner">
          <MaterialCommunityIcons name="test-tube" size={14} color="#7C2D12" />
          <Text style={styles.demoBannerText}>
            DEMO – simulierte Daten. Nur echte Bänder in Prod-Builds erfassen echte Werte.
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mein VitaGuide Band</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 + insets.bottom }]}>
        {/* Open dashboard */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => router.push('/wearable/dashboard' as any)}
          testID="device-settings-open-dashboard"
        >
          <MaterialCommunityIcons name="view-dashboard-variant" size={20} color="#FFFFFF" />
          <Text style={styles.dashboardBtnText}>Mein Tag – Dashboard öffnen</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Hero card */}
        <View style={styles.heroCard} testID="device-hero-card">
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="watch-variant" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.heroName}>{w.device.name || 'VitaGuide Band'}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.badge, w.state === 'connected' ? styles.badgeGreen : styles.badgeGray]}>
              <View style={[styles.dot, { backgroundColor: w.state === 'connected' ? '#10B981' : '#9CA3AF' }]} />
              <Text style={styles.badgeText}>
                {w.state === 'connected' ? 'Verbunden' :
                 w.state === 'syncing' ? 'Sync läuft' :
                 w.state === 'disconnected' ? 'Getrennt' :
                 w.state === 'unreachable' ? 'Nicht erreichbar' : 'Bereit'}
              </Text>
            </View>
            {typeof w.batteryLevel === 'number' && (
              <View style={[styles.badge, styles.badgeGray]}>
                <MaterialCommunityIcons name="battery" size={14} color="#4B5563" />
                <Text style={styles.badgeText}>{Math.round(w.batteryLevel)}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Rows */}
        <View style={styles.card}>
          <InfoRow label="Modell" value={w.device.model || '—'} />
          <InfoRow label="Seriennummer" value={w.device.serialNumber || '—'} />
          <InfoRow label="Firmware" value={w.device.firmwareVersion || '—'} />
          <InfoRow label="Zuletzt synchronisiert" value={w.lastSyncAt ? new Date(w.lastSyncAt).toLocaleString('de-DE') : 'Noch nie'} />
          <InfoRow label="Letzte Übertragung" value={w.lastSyncCount ? `${w.lastSyncCount} Datensätze` : '—'} isLast />
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <ActionRow
            icon="sync"
            label="Jetzt synchronisieren"
            testID="device-action-sync"
            onPress={doSync}
            busy={busy || w.state === 'syncing'}
          />
          <ActionRow
            icon="battery-heart"
            label="Akku aktualisieren"
            testID="device-action-battery"
            onPress={w.refreshBattery}
          />
          <ActionRow
            icon="cog"
            label="Einstellungen erneut senden"
            testID="device-action-settings"
            onPress={() => Alert.alert('Info', 'Ein separater Einstellungsassistent kommt in einem Folge-Update.')}
          />
          <ActionRow
            icon="magnify"
            label="Band suchen (Vibration)"
            testID="device-action-find"
            onPress={() => Alert.alert('Info', 'Diese Funktion wird verfügbar, sobald das native HBand-SDK integriert ist.')}
          />
          <ActionRow
            icon="heart-pulse"
            label="EKG‑Aufzeichnung starten"
            testID="device-action-ecg"
            onPress={() => router.push('/wearable/measure/ecg' as any)}
          />
          <ActionRow
            icon="cellphone-arrow-down"
            label="Firmware aktualisieren"
            testID="device-action-firmware"
            onPress={() => Alert.alert('Info', 'OTA-Updates werden nach erfolgreicher Prüfung mit den Mustergeräten aktiviert.')}
          />
          <ActionRow
            icon="download-outline"
            label="Diagnosebericht exportieren"
            testID="device-action-diagnostic"
            onPress={() => Alert.alert('Info', 'Der Diagnose-Export wird im QA-Sprint bereitgestellt.')}
            isLast
          />
        </View>

        {/* Danger zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Gerät entfernen</Text>
          <Text style={styles.dangerText}>
            Beim Trennen entscheidest du, ob deine gespeicherten Gesundheitsdaten erhalten bleiben.
          </Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={confirmUnpair} testID="device-action-unpair">
            <MaterialCommunityIcons name="link-variant-off" size={18} color="#B91C1C" />
            <Text style={styles.dangerBtnText}>Band trennen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const ActionRow = ({
  icon, label, onPress, busy, isLast, testID,
}: { icon: any; label: string; onPress: () => void; busy?: boolean; isLast?: boolean; testID?: string }) => (
  <TouchableOpacity style={[styles.actionRow, isLast && { borderBottomWidth: 0 }]} onPress={onPress} disabled={busy} testID={testID}>
    <MaterialCommunityIcons name={icon} size={20} color="#C2272F" />
    <Text style={styles.actionLabel}>{label}</Text>
    {busy ? <ActivityIndicator color="#C2272F" /> : <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  demoBanner: {
    backgroundColor: '#FED7AA', paddingVertical: 6, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  demoBannerText: { flex: 1, fontSize: 11, color: '#7C2D12', fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A2E35' },
  content: { padding: 20 },
  emptyWrap: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1A2E35', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  heroCard: {
    backgroundColor: '#C2272F', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 16,
  },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeGray: { backgroundColor: 'rgba(255,255,255,0.9)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#1A2E35' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, color: '#1A2E35', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  actionsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  actionLabel: { flex: 1, fontSize: 14, color: '#1A2E35', fontWeight: '600' },
  dangerCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  dangerTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  dangerText: { fontSize: 12, color: '#7F1D1D', marginBottom: 12, lineHeight: 18 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#B91C1C', borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dangerBtnText: { color: '#B91C1C', fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#C2272F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dashboardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2E35', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, marginBottom: 16,
  },
  dashboardBtnText: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
