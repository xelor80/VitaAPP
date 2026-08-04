import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWearable } from '../../src/WearableContext';
import { ProviderPicker } from '../../src/wearable/ProviderPicker';
import type { DiscoveredDevice } from '../../src/wearable/types';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function WearableOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const w = useWearable();
  const [step, setStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string>('');
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ inserted: number; total: number } | null>(null);
  const [devicePwd, setDevicePwd] = useState<string>('0000');
  const [showPwdField, setShowPwdField] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(v => setUserId(v || 'anonymous'));
  }, []);

  const goto = (s: Step) => setStep(s);

  const startScan = async () => {
    goto(3);
    await w.scan();
  };

  const doConnect = async (dev: DiscoveredDevice) => {
    setSelected(dev);
    goto(4);
    await w.pairAndConnect(userId, dev, devicePwd);
    if (w.state !== 'connected' && !w.device) return;
    goto(5);
  };

  const finishSettings = () => goto(6);

  const doFirstSync = async () => {
    setSyncing(true);
    const res = await w.syncNow(userId);
    setSyncResult(res);
    setSyncing(false);
    goto(7);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Demo Banner */}
      {w.isDemo && (
        <View style={styles.demoBanner} testID="wearable-demo-banner">
          <MaterialCommunityIcons name="test-tube" size={14} color="#7C2D12" />
          <Text style={styles.demoBannerText}>
            DEMO – simulierte Daten. Für echte Werte: VitaGuide Band koppeln oder Apple Health / Health Connect verbinden.
          </Text>
        </View>
      )}

      {/* Header with back + progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step === 1 ? router.back() : goto((step - 1) as Step))} style={styles.backBtn} testID="wearable-onboarding-back">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Schritt {step} von 7</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 7) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        {step === 1 && (
          <View testID="wearable-step-1">
            <MaterialCommunityIcons name="watch-variant" size={72} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Datenquelle wählen</Text>
            <Text style={styles.p}>
              VitaGuide arbeitet mit deinem VitaGuide Band, Apple Health, Health Connect oder
              simulierten Demo-Daten. Wähle eine Quelle – du kannst später wechseln.
            </Text>
            <ProviderPicker compact />
            <View style={styles.tipCard}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#C2272F" />
              <Text style={styles.tipText}>
                Die angezeigten Werte dienen der allgemeinen Information und ersetzen keine medizinische Untersuchung.
              </Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View testID="wearable-step-2">
            <MaterialCommunityIcons name="bluetooth" size={72} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Berechtigungen</Text>
            <Text style={styles.p}>
              Wir brauchen Bluetooth-Zugriff, um dein Band zu finden und Daten zu übertragen.
              Standortberechtigungen fragen wir nur, wenn dein Gerät sie technisch benötigt.
            </Text>
            <View style={styles.permList}>
              <PermRow icon="bluetooth" label="Bluetooth – Suche & Verbindung" />
              <PermRow icon="cellphone-link" label="Nahe Geräte finden" />
              <PermRow icon="shield-check" label="Wird nur für dein Band genutzt" />
            </View>
          </View>
        )}

        {step === 3 && (
          <View testID="wearable-step-3">
            <MaterialCommunityIcons name="radar" size={64} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Gerätesuche</Text>
            <Text style={styles.p}>
              Stelle sicher, dass dein Band eingeschaltet und in der Nähe ist.
            </Text>

            {/* Passwort-Eingabe (optional) */}
            <TouchableOpacity
              style={styles.pwdToggle}
              onPress={() => setShowPwdField(v => !v)}
              testID="wearable-pwd-toggle"
            >
              <MaterialCommunityIcons name={showPwdField ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
              <Text style={styles.pwdToggleText}>
                {showPwdField ? 'PIN ausblenden' : 'Kopplungs-PIN eingeben (falls nicht 0000)'}
              </Text>
            </TouchableOpacity>
            {showPwdField && (
              <View style={styles.pwdWrap}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#6B7280" />
                <TextInput
                  style={styles.pwdInput}
                  value={devicePwd}
                  onChangeText={(t) => setDevicePwd(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="0000"
                  placeholderTextColor="#9CA3AF"
                  testID="wearable-pwd-input"
                />
                <Text style={styles.pwdHint}>4-stellig, Werks-Default 0000</Text>
              </View>
            )}

            {w.state === 'scanning' && (
              <View style={styles.scanRow}>
                <ActivityIndicator color="#C2272F" />
                <Text style={styles.scanText}>Suche läuft …</Text>
              </View>
            )}
            {w.discovered.map(dev => (
              <TouchableOpacity
                key={dev.id}
                style={styles.deviceCard}
                onPress={() => doConnect(dev)}
                testID={`wearable-device-${dev.id}`}
              >
                <MaterialCommunityIcons name="watch" size={26} color="#C2272F" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{dev.name}</Text>
                  <Text style={styles.deviceMeta}>
                    {dev.model || dev.provider}
                    {typeof dev.rssi === 'number' ? ` · Signal ${dev.rssi} dBm` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
            {w.state !== 'scanning' && w.discovered.length === 0 && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={startScan} testID="wearable-rescan-btn">
                <MaterialCommunityIcons name="refresh" size={18} color="#C2272F" />
                <Text style={styles.secondaryBtnText}>Erneut suchen</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 4 && (
          <View testID="wearable-step-4">
            <MaterialCommunityIcons name="link-variant" size={72} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Verbindung</Text>
            {w.state === 'connecting' && (
              <>
                <ActivityIndicator size="large" color="#C2272F" style={{ marginVertical: 16 }} />
                <Text style={styles.p}>Verbinde mit {selected?.name} …</Text>
              </>
            )}
            {w.state === 'connected' && (
              <>
                <View style={styles.successIconWrap}>
                  <MaterialCommunityIcons name="check-circle" size={72} color="#059669" />
                </View>
                <Text style={styles.h2}>Verbunden ✔</Text>
                <Text style={styles.p}>
                  {w.device?.name}{'  '}
                  {typeof w.batteryLevel === 'number' ? `· Akku ${Math.round(w.batteryLevel)}%` : ''}
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={finishSettings} testID="wearable-step4-next">
                  <Text style={styles.primaryBtnText}>Weiter</Text>
                </TouchableOpacity>
              </>
            )}
            {w.errorText && (
              <Text style={styles.errorText} testID="wearable-error-text">{w.errorText}</Text>
            )}
          </View>
        )}

        {step === 5 && (
          <View testID="wearable-step-5">
            <MaterialCommunityIcons name="account-cog" size={72} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Persönliche Einstellungen</Text>
            <Text style={styles.p}>
              Diese Werte helfen dem Band, deine Messungen präziser zu machen. Wir übertragen sie an
              das Band – nur was das SDK unterstützt.
            </Text>
            <View style={styles.settingsList}>
              <SettingRow icon="calendar" label="Geburtsdatum" value="aus Profil übernommen" />
              <SettingRow icon="human-male-height" label="Größe" value="aus Profil übernommen" />
              <SettingRow icon="weight-kilogram" label="Gewicht" value="aus Profil übernommen" />
              <SettingRow icon="hand-back-right" label="Handgelenk" value="Nicht-dominante Hand" />
              <SettingRow icon="clock-outline" label="Zeitformat" value="24 Stunden" />
              <SettingRow icon="shoe-print" label="Tagesziel" value="8.000 Schritte" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={doFirstSync} testID="wearable-step5-sync">
              <Text style={styles.primaryBtnText}>Übernehmen & synchronisieren</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 6 && (
          <View testID="wearable-step-6">
            <MaterialCommunityIcons name="cloud-download" size={72} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>Erste Synchronisierung</Text>
            {syncing ? (
              <>
                <ActivityIndicator size="large" color="#C2272F" style={{ marginVertical: 16 }} />
                <Text style={styles.p}>Daten werden übertragen …</Text>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={doFirstSync} testID="wearable-first-sync-btn">
                <Text style={styles.primaryBtnText}>Jetzt synchronisieren</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 7 && (
          <View testID="wearable-step-7">
            <View style={styles.successIconWrap}>
              <MaterialCommunityIcons name="party-popper" size={72} color="#059669" />
            </View>
            <Text style={styles.h1}>Alles bereit!</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Band verbunden" value={w.device?.name || 'Unbekannt'} />
              <SummaryRow label="Akkustand" value={typeof w.batteryLevel === 'number' ? `${Math.round(w.batteryLevel)} %` : '–'} />
              <SummaryRow label="Letzte Synchronisierung" value={w.lastSyncAt ? new Date(w.lastSyncAt).toLocaleString('de-DE') : '–'} />
              <SummaryRow label="Messwerte übertragen" value={syncResult ? `${syncResult.total}` : '–'} />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')} testID="wearable-finish-btn">
              <Text style={styles.primaryBtnText}>Zur App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/wearable/device-settings')}>
              <Text style={styles.linkText}>Zur Geräteverwaltung</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer with next button (steps 1, 2) */}
      {(step === 1 || step === 2) && (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={step === 1 ? () => goto(2) : startScan}
            testID="wearable-onboarding-next"
          >
            <Text style={styles.primaryBtnText}>{step === 1 ? 'Los geht\'s' : 'Band suchen'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const PermRow = ({ icon, label }: { icon: any; label: string }) => (
  <View style={styles.permRow}>
    <MaterialCommunityIcons name={icon} size={20} color="#C2272F" />
    <Text style={styles.permText}>{label}</Text>
  </View>
);

const SettingRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.settingRow}>
    <MaterialCommunityIcons name={icon} size={20} color="#6B7280" />
    <Text style={styles.settingLabel}>{label}</Text>
    <Text style={styles.settingValue}>{value}</Text>
  </View>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
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
    paddingHorizontal: 12, paddingVertical: 8,
  },
  backBtn: { padding: 4 },
  stepLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBar: { height: 3, backgroundColor: '#FEE2E2', marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C2272F' },
  content: { padding: 20 },
  bigIcon: { alignSelf: 'center', marginBottom: 16 },
  h1: { fontSize: 26, fontWeight: '800', color: '#1A2E35', textAlign: 'center', marginBottom: 10 },
  h2: { fontSize: 22, fontWeight: '800', color: '#1A2E35', textAlign: 'center', marginBottom: 8 },
  p: { fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  tipCard: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FEE2E2',
    borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
  permList: { marginTop: 12, gap: 10 },
  permRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  permText: { fontSize: 14, color: '#1A2E35', fontWeight: '600' },
  scanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginVertical: 20 },
  scanText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  pwdToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 8, marginBottom: 6,
  },
  pwdToggleText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  pwdWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  pwdInput: {
    fontSize: 18, fontWeight: '700', color: '#1A2E35',
    letterSpacing: 6, minWidth: 78, paddingVertical: 4,
  },
  pwdHint: { flex: 1, fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  deviceCard: {
    backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginTop: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  deviceName: { fontSize: 15, fontWeight: '700', color: '#1A2E35' },
  deviceMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  successIconWrap: { alignItems: 'center', marginVertical: 12 },
  errorText: { color: '#B91C1C', fontSize: 13, textAlign: 'center', marginTop: 12 },
  settingsList: { marginTop: 12, gap: 8 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  settingLabel: { flex: 1, fontSize: 14, color: '#1A2E35' },
  settingValue: { fontSize: 12, color: '#6B7280' },
  summaryCard: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#1A2E35', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#C2272F', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', marginTop: 16,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#C2272F', borderRadius: 12,
    paddingVertical: 12, marginTop: 12,
  },
  secondaryBtnText: { color: '#C2272F', fontSize: 14, fontWeight: '700' },
  linkBtn: { marginTop: 12, alignItems: 'center', padding: 8 },
  linkText: { color: '#C2272F', fontSize: 14, fontWeight: '600' },
  footer: {
    paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});
