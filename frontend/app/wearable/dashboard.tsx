import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWearable } from '../../src/WearableContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Baseline { median: number|null; days_used: number; sufficient: boolean; latest_value: number|null; delta_pct: number|null }
interface ScoreValue { value: number|null; beta: boolean; debug?: any }
interface ScoresResponse {
  days_of_data: number;
  in_learning_phase: boolean;
  data_completeness: number;
  note: string;
  scores: { recovery: ScoreValue; sleep: ScoreValue; activity: ScoreValue; readiness: ScoreValue };
  baselines: Record<string, Baseline>;
}

export default function WearableDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const w = useWearable();
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ScoresResponse | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(v => setUserId(v || 'anonymous'));
  }, []);

  const load = useCallback(async (isRefresh?: boolean) => {
    if (!userId) return;
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_URL}/api/wearable/scores/${userId}?date=${today}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doSync = async () => {
    if (!userId) return;
    await w.syncNow(userId);
    await load(true);
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C2272F" testID="dashboard-loading" />
        </View>
      </SafeAreaView>
    );
  }

  const scoreItems = [
    { key: 'readiness', label: 'Readiness', icon: 'flash', color: '#C2272F' },
    { key: 'recovery', label: 'Erholung', icon: 'heart-pulse', color: '#059669' },
    { key: 'sleep', label: 'Schlaf', icon: 'weather-night', color: '#4338CA' },
    { key: 'activity', label: 'Aktivität', icon: 'run', color: '#EA580C' },
  ] as const;

  const metricCards: {key: keyof ScoresResponse['baselines']; label: string; icon: any; unit: string; goodDirection: 'up'|'down'|'neutral'}[] = [
    { key: 'hrv', label: 'HRV (Bandmesswert)', icon: 'sine-wave', unit: 'ms', goodDirection: 'up' },
    { key: 'resting_heart_rate', label: 'Ruhepuls', icon: 'heart', unit: 'bpm', goodDirection: 'down' },
    { key: 'spo2', label: 'Sauerstoff', icon: 'water-percent', unit: '%', goodDirection: 'up' },
    { key: 'skin_temperature', label: 'Hauttemperatur', icon: 'thermometer', unit: '°C', goodDirection: 'neutral' },
    { key: 'steps', label: 'Schritte', icon: 'shoe-print', unit: '', goodDirection: 'up' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {w.isDemo && (
        <View style={styles.demoBanner} testID="dashboard-demo-banner">
          <MaterialCommunityIcons name="test-tube" size={14} color="#7C2D12" />
          <Text style={styles.demoBannerText}>DEMO – simulierte Daten. Für echte Werte einen Prod-Build mit HBand-SDK.</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Mein Tag</Text>
          <Text style={styles.headerSub}>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</Text>
        </View>
        <TouchableOpacity onPress={doSync} style={styles.iconBtn} testID="dashboard-sync-btn">
          <MaterialCommunityIcons name={w.state === 'syncing' ? 'sync' : 'sync-circle'} size={26} color="#C2272F" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 60 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#C2272F" />}
      >
        {/* Learning phase banner */}
        {data.in_learning_phase && (
          <View style={styles.learningCard} testID="dashboard-learning-card">
            <MaterialCommunityIcons name="school" size={22} color="#C2272F" />
            <View style={{ flex: 1 }}>
              <Text style={styles.learningTitle}>VitaGuide lernt deinen Rhythmus</Text>
              <Text style={styles.learningText}>{data.note}</Text>
              <View style={styles.learningProgress}>
                <View style={[styles.learningBar, { width: `${Math.min(100, (data.days_of_data / 7) * 100)}%` }]} />
              </View>
              <Text style={styles.learningDays}>{data.days_of_data} / 7 Tage</Text>
            </View>
          </View>
        )}

        {/* Header stats row */}
        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <MaterialCommunityIcons name="battery" size={14} color="#4B5563" />
            <Text style={styles.statusText}>{typeof w.batteryLevel === 'number' ? `${Math.round(w.batteryLevel)}%` : '–'}</Text>
          </View>
          <View style={styles.statusPill}>
            <MaterialCommunityIcons name="cloud-check" size={14} color="#4B5563" />
            <Text style={styles.statusText}>{w.lastSyncAt ? new Date(w.lastSyncAt).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : '–'}</Text>
          </View>
          <View style={styles.statusPill}>
            <MaterialCommunityIcons name="chart-donut" size={14} color="#4B5563" />
            <Text style={styles.statusText}>{Math.round(data.data_completeness * 100)}% vollständig</Text>
          </View>
        </View>

        {/* Score Cards Grid */}
        <View style={styles.scoresGrid}>
          {scoreItems.map(s => {
            const sv = data.scores[s.key];
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.scoreCard, s.key === 'readiness' && styles.scoreCardHero]}
                onPress={() => router.push({ pathname: '/wearable/detail/[metric]', params: { metric: s.key === 'sleep' ? 'sleep' : s.key === 'activity' ? 'steps' : 'hrv' } } as any)}
                testID={`dashboard-score-${s.key}`}
              >
                <View style={styles.scoreHeader}>
                  <MaterialCommunityIcons name={s.icon as any} size={s.key === 'readiness' ? 22 : 18} color={s.color} />
                  <Text style={[styles.scoreLabel, s.key === 'readiness' && { color: '#FFFFFF' }]}>{s.label}</Text>
                </View>
                <View style={styles.scoreValueRow}>
                  <Text style={[styles.scoreValue, s.key === 'readiness' && { color: '#FFFFFF' }]}>
                    {sv.value === null ? '–' : Math.round(sv.value)}
                  </Text>
                  {sv.value !== null && (
                    <Text style={[styles.scoreUnit, s.key === 'readiness' && { color: 'rgba(255,255,255,0.85)' }]}>/100</Text>
                  )}
                  <View style={[styles.betaBadge, s.key === 'readiness' && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Text style={[styles.betaText, s.key === 'readiness' && { color: '#FFFFFF' }]}>BETA</Text>
                  </View>
                </View>
                {sv.value === null && sv.debug?.reason && (
                  <Text style={[styles.scoreHint, s.key === 'readiness' && { color: 'rgba(255,255,255,0.9)' }]}>
                    {sv.debug.reason === 'no_sleep_data' ? 'Keine Schlafdaten' :
                     sv.debug.reason === 'no_activity_data' ? 'Keine Aktivität erfasst' :
                     sv.debug.reason === 'insufficient_baseline_data' ? 'Zu wenig Basisdaten' :
                     sv.debug.reason === 'need_recovery_and_sleep' ? 'Erholung + Schlaf nötig' : 'Warte auf mehr Daten'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Metric Cards */}
        <Text style={styles.sectionTitle}>Deine Werte heute</Text>

        {/* ECG CTA */}
        <TouchableOpacity
          style={styles.ecgCta}
          onPress={() => router.push('/wearable/measure/ecg' as any)}
          testID="dashboard-ecg-cta"
        >
          <View style={styles.ecgIconWrap}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ecgTitle}>30‑Sek. EKG aufzeichnen</Text>
            <Text style={styles.ecgSub}>Live‑Waveform, manuelle Wellness‑Messung</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        {metricCards.map(m => {
          const b = data.baselines[m.key];
          const hasBaseline = b?.sufficient;
          const isGood =
            m.goodDirection === 'neutral' ? Math.abs(b?.delta_pct || 0) < 3 :
            m.goodDirection === 'up' ? (b?.delta_pct || 0) >= 0 :
            (b?.delta_pct || 0) <= 0;
          return (
            <TouchableOpacity
              key={m.key}
              style={styles.metricCard}
              onPress={() => router.push({ pathname: '/wearable/detail/[metric]', params: { metric: m.key } } as any)}
              testID={`dashboard-metric-${m.key}`}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: hasBaseline && isGood ? '#D1FAE5' : hasBaseline ? '#FEF3C7' : '#F3F4F6' }]}>
                <MaterialCommunityIcons name={m.icon} size={22} color={hasBaseline && isGood ? '#065F46' : hasBaseline ? '#92400E' : '#6B7280'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>
                    {b?.latest_value !== null && b?.latest_value !== undefined
                      ? m.key === 'steps' ? Math.round(b.latest_value).toLocaleString('de-DE') : b.latest_value.toFixed(m.key === 'skin_temperature' ? 1 : 0)
                      : '–'}
                  </Text>
                  {m.unit && <Text style={styles.metricUnit}>{m.unit}</Text>}
                </View>
                {b?.sufficient && b.delta_pct !== null && (
                  <Text style={[styles.metricDelta, { color: isGood ? '#065F46' : '#92400E' }]}>
                    {b.delta_pct > 0 ? '+' : ''}{b.delta_pct}% vs. deine Basislinie
                  </Text>
                )}
                {!b?.sufficient && (
                  <Text style={styles.metricDelta}>Basislinie in Aufbau ({b?.days_used || 0}/7 Tage)</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          );
        })}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#78350F" />
          <Text style={styles.disclaimerText}>
            Die angezeigten Werte dienen der allgemeinen Wellness-Information und ersetzen keine medizinische Untersuchung.
            VitaGuide-Scores sind BETA und werden mit mehr Daten präziser.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  demoBanner: { backgroundColor: '#FED7AA', paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoBannerText: { flex: 1, fontSize: 11, color: '#7C2D12', fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A2E35' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  learningCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 14,
  },
  learningTitle: { fontSize: 14, fontWeight: '800', color: '#7F1D1D' },
  learningText: { fontSize: 12, color: '#7F1D1D', marginTop: 4, lineHeight: 17 },
  learningProgress: { height: 6, backgroundColor: '#FEE2E2', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  learningBar: { height: '100%', backgroundColor: '#C2272F', borderRadius: 3 },
  learningDays: { fontSize: 11, fontWeight: '600', color: '#7F1D1D', marginTop: 4 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB',
  },
  statusText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },

  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  scoreCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  scoreCardHero: {
    width: '100%', backgroundColor: '#C2272F', borderColor: '#C2272F',
    paddingVertical: 18,
  },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreValue: { fontSize: 32, fontWeight: '800', color: '#1A2E35' },
  scoreUnit: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  scoreHint: { fontSize: 11, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
  betaBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginLeft: 'auto', marginBottom: 6,
  },
  betaText: { fontSize: 9, color: '#C2272F', fontWeight: '800', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A2E35', marginBottom: 10, marginTop: 4 },
  metricCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  metricIconWrap: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  metricLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#1A2E35' },
  metricUnit: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  metricDelta: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 },

  disclaimerCard: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24', borderWidth: 1, borderRadius: 10,
    padding: 10, marginTop: 16, alignItems: 'flex-start',
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#78350F', lineHeight: 15 },
  ecgCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A2E35', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, marginBottom: 10,
  },
  ecgIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  ecgTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  ecgSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
