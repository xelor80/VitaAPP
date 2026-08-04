import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { labelForMetric, ESTIMATE_METRICS, type MetricType } from '../../../src/wearable/types';
import { EstimateDisclaimer } from '../../../src/wearable/EstimateDisclaimer';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
type Range = 'day' | 'week' | 'month' | '3month' | 'year';

const RANGES: { key: Range; label: string }[] = [
  { key: 'day', label: 'Tag' },
  { key: 'week', label: 'Woche' },
  { key: 'month', label: 'Monat' },
  { key: '3month', label: '3 Mon.' },
  { key: 'year', label: 'Jahr' },
];

const METRIC_META: Record<string, { icon: any; unit: string; color: string; goodDirection: 'up'|'down'|'neutral' }> = {
  heart_rate: { icon: 'heart-pulse', unit: 'bpm', color: '#EF4444', goodDirection: 'down' },
  resting_heart_rate: { icon: 'heart', unit: 'bpm', color: '#DC2626', goodDirection: 'down' },
  hrv: { icon: 'sine-wave', unit: 'ms', color: '#0EA5E9', goodDirection: 'up' },
  spo2: { icon: 'water-percent', unit: '%', color: '#059669', goodDirection: 'up' },
  skin_temperature: { icon: 'thermometer', unit: '°C', color: '#F97316', goodDirection: 'neutral' },
  respiration_rate: { icon: 'weather-windy', unit: '/min', color: '#7C3AED', goodDirection: 'neutral' },
  steps: { icon: 'shoe-print', unit: '', color: '#EA580C', goodDirection: 'up' },
  active_minutes: { icon: 'run', unit: 'min', color: '#EA580C', goodDirection: 'up' },
  calories_kcal: { icon: 'fire', unit: 'kcal', color: '#F59E0B', goodDirection: 'up' },
  blood_glucose_estimated: { icon: 'water', unit: 'mg/dl', color: '#8B5CF6', goodDirection: 'neutral' },
  blood_pressure_systolic: { icon: 'gauge', unit: 'mmHg', color: '#B91C1C', goodDirection: 'neutral' },
  ecg: { icon: 'chart-line-variant', unit: 'bpm', color: '#EC4899', goodDirection: 'neutral' },
};

interface TimeseriesPoint { day?: string; measured_at?: string; avg?: number|null; value?: number; min?: number; max?: number }
interface TimeseriesData {
  range: Range;
  metric: string;
  granularity: string;
  points: TimeseriesPoint[];
  stats?: { avg: number|null; min: number|null; max: number|null; days: number };
}

export default function MetricDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { metric } = useLocalSearchParams<{ metric: string }>();
  const [userId, setUserId] = useState('');
  const [range, setRange] = useState<Range>('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeseriesData | null>(null);
  const [baseline, setBaseline] = useState<{median:number|null; sufficient:boolean; days_used:number}|null>(null);

  const meta = METRIC_META[metric as string] || { icon: 'chart-line', unit: '', color: '#6B7280', goodDirection: 'neutral' };
  const label = labelForMetric(metric as MetricType);
  const isEstimate = ESTIMATE_METRICS.includes(metric as MetricType);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(v => setUserId(v || 'anonymous'));
  }, []);

  const load = useCallback(async () => {
    if (!userId || !metric) return;
    setLoading(true);
    try {
      const [tsRes, baseRes] = await Promise.all([
        fetch(`${API_URL}/api/wearable/timeseries/${userId}/${metric}?range=${range}`),
        fetch(`${API_URL}/api/wearable/baselines/${userId}`),
      ]);
      const ts: TimeseriesData = await tsRes.json();
      const baselines = await baseRes.json();
      setData(ts);
      setBaseline(baselines[metric as string] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, metric, range]);

  useEffect(() => { load(); }, [load]);

  const chart = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return null;
    const labels = data.points.map(p => {
      if (data.granularity === 'raw' && p.measured_at) {
        return p.measured_at.slice(11, 16);
      }
      return p.day ? p.day.slice(5) : '';
    });
    const values = data.points.map(p => {
      const v = data.granularity === 'raw' ? p.value : p.avg;
      return typeof v === 'number' ? v : 0;
    });
    // Reduce labels to max ~6 for readability
    const step = Math.max(1, Math.ceil(labels.length / 6));
    const sparseLabels = labels.map((l, i) => (i % step === 0 ? l : ''));
    return { labels: sparseLabels, values };
  }, [data]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="metric-detail-back">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
          <Text style={styles.headerTitle} testID="metric-detail-title">{label}</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        {isEstimate && (
          <EstimateDisclaimer testID="metric-detail-disclaimer" />
        )}

        {/* Range selector */}
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
              onPress={() => setRange(r.key)}
              testID={`metric-range-${r.key}`}
            >
              <Text style={[styles.rangeText, range === r.key && styles.rangeTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={meta.color} testID="metric-detail-loading" />
          </View>
        ) : !chart ? (
          <View style={styles.emptyCard} testID="metric-detail-empty">
            <MaterialCommunityIcons name="chart-line-variant" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>Noch keine Daten in diesem Zeitraum.</Text>
          </View>
        ) : (
          <>
            {/* Chart */}
            <View style={styles.chartCard}>
              <LineChart
                data={{ labels: chart.labels, datasets: [{ data: chart.values.length > 0 ? chart.values : [0] }] }}
                width={Dimensions.get('window').width - 48}
                height={200}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels
                withHorizontalLabels
                bezier
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  color: (opacity = 1) => `${meta.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                  labelColor: () => '#9CA3AF',
                  strokeWidth: 2.5,
                  propsForDots: { r: '3.5', strokeWidth: '0' },
                  propsForBackgroundLines: { stroke: '#F3F4F6' },
                  decimalPlaces: metric === 'skin_temperature' ? 1 : 0,
                }}
                style={{ marginLeft: -14, borderRadius: 10 }}
              />
            </View>

            {/* Stats */}
            {data?.stats && (
              <View style={styles.statsGrid}>
                <StatCell label="Ø" value={data.stats.avg !== null ? formatVal(data.stats.avg, metric as string) : '–'} unit={meta.unit} />
                <StatCell label="Min" value={data.stats.min !== null ? formatVal(data.stats.min, metric as string) : '–'} unit={meta.unit} />
                <StatCell label="Max" value={data.stats.max !== null ? formatVal(data.stats.max, metric as string) : '–'} unit={meta.unit} />
                <StatCell label="Tage" value={String(data.stats.days || data.points.length)} unit="" />
              </View>
            )}
          </>
        )}

        {/* Baseline card */}
        {baseline && (
          <View style={styles.baselineCard} testID="metric-detail-baseline">
            <View style={styles.baselineHeader}>
              <MaterialCommunityIcons name="chart-bell-curve" size={18} color="#4B5563" />
              <Text style={styles.baselineTitle}>Deine persönliche Basislinie</Text>
            </View>
            {baseline.sufficient ? (
              <Text style={styles.baselineText}>
                Deine typische Bandbreite: <Text style={{ fontWeight: '800' }}>{formatVal(baseline.median || 0, metric as string)} {meta.unit}</Text>{' '}
                (aus den letzten {baseline.days_used} Tagen)
              </Text>
            ) : (
              <Text style={styles.baselineText}>
                Basislinie wird noch aufgebaut ({baseline.days_used}/7 Tage). Trage dein Band regelmäßig, damit VitaGuide deinen Rhythmus lernt.
              </Text>
            )}
          </View>
        )}

        {/* Explainer */}
        <View style={styles.explainCard}>
          <Text style={styles.explainTitle}>Was heißt das?</Text>
          <Text style={styles.explainText}>{explainerFor(metric as string)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatVal(v: number, metric: string): string {
  if (metric === 'skin_temperature') return v.toFixed(1);
  if (metric === 'steps') return Math.round(v).toLocaleString('de-DE');
  return Math.round(v).toString();
}

function explainerFor(metric: string): string {
  const map: Record<string, string> = {
    heart_rate: 'Die Herzfrequenz zeigt, wie oft dein Herz pro Minute schlägt. Sie schwankt je nach Aktivität, Stress, Koffein und Emotionen.',
    resting_heart_rate: 'Dein Ruhepuls (typisch morgens gemessen) ist ein Indikator für dein allgemeines Fitnesslevel und deine Erholung.',
    hrv: 'Die Herzratenvariabilität beschreibt kleine Schwankungen zwischen den Herzschlägen. Höhere Werte deuten oft auf gute Erholung, niedrige auf Belastung hin.',
    spo2: 'Die Sauerstoffsättigung zeigt, wie viel Sauerstoff dein Blut transportiert. Werte um 95–99 % sind normal.',
    skin_temperature: 'Deine Hauttemperatur schwankt tageszeitlich und mit deinem Zyklus. Größere Abweichungen von deinem Normalwert können auf Belastung oder beginnende Krankheit hinweisen.',
    steps: 'Schritte sind das einfachste Aktivitätsmaß. Für Erwachsene werden meist 7.000–10.000 Schritte pro Tag empfohlen.',
    active_minutes: 'Aktive Minuten sind Zeiten mit erhöhter Herzfrequenz durch Bewegung. Ein Ziel von 30 min/Tag ist ein guter Start.',
    calories_kcal: 'Aktive Kalorien sind Kalorien, die zusätzlich zum Ruhestoffwechsel durch Bewegung verbraucht werden.',
    ecg: 'Das EKG zeigt den elektrischen Verlauf deines Herzschlags. VitaGuide zeichnet nur auf – interpretiere Auffälligkeiten nie selbst, sondern lasse sie ärztlich prüfen.',
    blood_glucose_estimated: 'Optische Blutzucker-Schätzung des Bandes. Kein diagnostischer Wert. Für belastbare Werte nutze ein zugelassenes Messgerät.',
    blood_pressure_systolic: 'Systolischer Blutdruck als Wellness-Schätzung. Nicht diagnostisch.',
    blood_pressure_diastolic: 'Diastolischer Blutdruck als Wellness-Schätzung. Nicht diagnostisch.',
  };
  return map[metric] || 'Detail-Info folgt in einem späteren Update.';
}

const StatCell = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <View style={styles.statCell}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text style={styles.statValue}>{value}</Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A2E35' },
  content: { padding: 16 },
  center: { padding: 40, alignItems: 'center' },
  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#6B7280', marginTop: 10, fontSize: 13 },
  rangeRow: {
    flexDirection: 'row', gap: 6, backgroundColor: '#FFFFFF',
    padding: 4, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
  },
  rangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  rangeBtnActive: { backgroundColor: '#C2272F' },
  rangeText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  rangeTextActive: { color: '#FFFFFF' },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  statCell: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1A2E35' },
  statUnit: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
  baselineCard: {
    backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 12,
  },
  baselineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  baselineTitle: { fontSize: 13, fontWeight: '800', color: '#0C4A6E' },
  baselineText: { fontSize: 12, color: '#0C4A6E', lineHeight: 17 },
  explainCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  explainTitle: { fontSize: 13, fontWeight: '800', color: '#1A2E35', marginBottom: 6 },
  explainText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
});
