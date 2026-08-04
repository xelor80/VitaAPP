/**
 * Compact wearable card for the home tab.
 * - If a wearable is paired: shows Readiness score + top metric delta + battery + last sync.
 * - If not paired: subtle CTA to connect a band.
 * Tapping opens the wearable dashboard.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface WearableSummary {
  available: boolean;
  device_name?: string | null;
  battery_level?: number | null;
  last_sync_at?: string | null;
  in_learning_phase?: boolean;
  days_of_data?: number;
  data_completeness?: number;
  readiness?: number | null;
  recovery?: number | null;
  sleep?: number | null;
  hrv_delta_pct?: number | null;
  hrv_sufficient?: boolean;
}

interface Props {
  data?: WearableSummary | null;
  loading?: boolean;
  isDemo?: boolean;
}

const CTA_LABEL_DE = 'Verbinde dein VitaGuide Band';
const CTA_SUB_DE = 'Automatische Erfassung von Herz, Schlaf und Erholung';

export const HomeWearableWidget: React.FC<Props> = ({ data, loading, isDemo }) => {
  const router = useRouter();

  // No device paired → CTA card
  if (!loading && (!data || !data.available)) {
    return (
      <TouchableOpacity
        style={styles.ctaCard}
        onPress={() => router.push('/wearable/onboarding' as any)}
        activeOpacity={0.85}
        testID="home-wearable-cta"
      >
        <View style={styles.ctaIconWrap}>
          <MaterialCommunityIcons name="watch-variant" size={22} color="#C2272F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{CTA_LABEL_DE}</Text>
          <Text style={styles.ctaSub}>{CTA_SUB_DE}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  }

  const readiness = data?.readiness;
  const hrvDelta = data?.hrv_delta_pct;
  const battery = data?.battery_level;
  const learning = data?.in_learning_phase;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/wearable/dashboard' as any)}
      activeOpacity={0.85}
      testID="home-wearable-widget"
    >
      {isDemo && (
        <View style={styles.demoTag} testID="home-wearable-demo-tag">
          <Text style={styles.demoTagText}>DEMO</Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ padding: 22 }} testID="home-wearable-loading" />
      ) : (
        <>
          <View style={styles.left}>
            <Text style={styles.eyebrow}>Mein Tag</Text>
            <Text style={styles.title}>{data?.device_name || 'VitaGuide Band'}</Text>
            <View style={styles.chipRow}>
              {typeof battery === 'number' && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="battery" size={11} color="#FFFFFF" />
                  <Text style={styles.chipText}>{Math.round(battery)}%</Text>
                </View>
              )}
              {typeof data?.data_completeness === 'number' && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="chart-donut" size={11} color="#FFFFFF" />
                  <Text style={styles.chipText}>{Math.round((data.data_completeness || 0) * 100)}%</Text>
                </View>
              )}
            </View>
            {learning ? (
              <Text style={styles.hint}>Lernt deinen Rhythmus – {data?.days_of_data || 0}/7 Tage</Text>
            ) : hrvDelta !== null && hrvDelta !== undefined && data?.hrv_sufficient ? (
              <Text style={styles.hint}>
                HRV {hrvDelta > 0 ? '+' : ''}{hrvDelta}% vs. Basislinie
              </Text>
            ) : (
              <Text style={styles.hint}>Tippe für Details</Text>
            )}
          </View>

          <View style={styles.right}>
            <Text style={styles.scoreLabel}>READINESS</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue} testID="home-wearable-readiness">
                {readiness === null || readiness === undefined ? '–' : Math.round(readiness)}
              </Text>
              {readiness !== null && readiness !== undefined && (
                <Text style={styles.scoreUnit}>/100</Text>
              )}
            </View>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#C2272F',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#C2272F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  demoTag: {
    position: 'absolute', top: 8, right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  demoTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  left: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2 },
  title: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontStyle: 'italic' },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 82,
  },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.2 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  scoreValue: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', lineHeight: 40 },
  scoreUnit: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 6, marginLeft: 2 },
  betaBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginTop: 4,
  },
  betaText: { fontSize: 8, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.8 },

  ctaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 12,
  },
  ctaIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: '#1A2E35' },
  ctaSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
