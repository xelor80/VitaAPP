/**
 * ProviderPicker – lässt den User auswählen, woher Gesundheitsdaten kommen sollen:
 *   - VitaGuide Band (Mecoly E500)  → HBand-SDK
 *   - Apple Health (iOS) / Health Connect (Android)  → System-Health-API
 *   - Demo-Modus  → simulierte Daten
 *
 * Verfügbarkeit wird zur Laufzeit ermittelt (welche Native-Bridge ist verlinkt?).
 * Die Wahl wird persistiert und der aktive Provider gewechselt.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWearable } from '../WearableContext';
import type { ProviderId } from './index';

const META: Record<ProviderId, { icon: any; title: string; subtitle: string; badge?: string }> = {
  hband: {
    icon: 'watch-variant',
    title: 'VitaGuide Band',
    subtitle: 'Mecoly E500 – 24h EKG, HRV, Schlaf, SpO₂, Blutzucker-Schätzung',
    badge: 'Empfohlen',
  },
  healthkit: {
    icon: 'apple',
    title: 'Apple Health',
    subtitle: 'iPhone + Apple Watch. Nutzt Daten die bereits in Apple Health synchronisiert werden.',
  },
  health_connect: {
    icon: 'android',
    title: 'Health Connect',
    subtitle: 'Samsung Health, Google Fit, Fitbit, Garmin, Oura, Polar & mehr.',
  },
  demo: {
    icon: 'test-tube',
    title: 'Demo-Modus',
    subtitle: 'Simulierte Daten zum Ausprobieren – keine echten Messwerte.',
  },
};

export const ProviderPicker: React.FC<{
  onPicked?: (id: ProviderId) => void;
  compact?: boolean;
}> = ({ onPicked, compact }) => {
  const w = useWearable();
  const pick = async (id: ProviderId) => {
    await w.switchProvider(id);
    onPicked?.(id);
  };

  return (
    <ScrollView
      style={{ flexGrow: 0 }}
      contentContainerStyle={compact ? styles.compactWrap : styles.wrap}
      testID="wearable-provider-picker"
    >
      {!compact && (
        <>
          <Text style={styles.h1}>Wähle deine Datenquelle</Text>
          <Text style={styles.p}>
            VitaGuide kann Gesundheitsdaten aus verschiedenen Quellen lesen.
            Du kannst später jederzeit wechseln.
          </Text>
        </>
      )}

      {w.availableProviders.map(p => {
        const m = META[p.id];
        const active = w.providerId === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => pick(p.id)}
            testID={`wearable-provider-${p.id}`}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <MaterialCommunityIcons name={m.icon as any} size={26} color={active ? '#FFF' : '#C2272F'} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowLine}>
                <Text style={styles.title}>{m.title}</Text>
                {m.badge && p.id === 'hband' && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{m.badge}</Text></View>
                )}
                {!p.native && (
                  <View style={styles.badgeDemo}><Text style={styles.badgeDemoText}>Demo</Text></View>
                )}
              </View>
              <Text style={styles.subtitle}>{m.subtitle}</Text>
              {p.id === 'healthkit' && Platform.OS !== 'ios' && (
                <Text style={styles.hint}>Nur auf iPhone/iPad verfügbar.</Text>
              )}
              {p.id === 'health_connect' && Platform.OS !== 'android' && (
                <Text style={styles.hint}>Nur auf Android verfügbar.</Text>
              )}
              {p.id === 'hband' && !w.isNativeAvailable && (
                <Text style={styles.hint}>Wird erst nach Installation des Dev-/Prod-Builds mit HBand-SDK aktiv.</Text>
              )}
            </View>
            {active && (
              <MaterialCommunityIcons name="check-circle" size={22} color="#059669" />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  compactWrap: { padding: 12, gap: 8 },
  h1: { fontSize: 22, fontWeight: '800', color: '#1A2E35', marginBottom: 6 },
  p: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14,
  },
  cardActive: { borderColor: '#C2272F', backgroundColor: '#FEF7F7' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  iconWrapActive: { backgroundColor: '#C2272F' },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 15, fontWeight: '700', color: '#1A2E35' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  hint: { fontSize: 11, color: '#B45309', marginTop: 4, fontStyle: 'italic' },
  badge: { backgroundColor: '#C2272F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  badgeDemo: { backgroundColor: '#FED7AA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeDemoText: { color: '#7C2D12', fontSize: 10, fontWeight: '700' },
});
